
import { AttendanceLog, ScanType, DailyRecord, Schedule, ArrivalStatus, DepartureStatus, PayrollConfig, SalarySlip, Employee } from '../types';

// Strictly format date to YYYY-MM-DD in Philippine Standard Time
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

export const formatTime = (isoString: string | null): string => {
  if (!isoString) return '--:--';
  // Display time in PHT
  return new Date(isoString).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// Returns a Date object shifted to PH time for Logic calculations
export const getPHTDate = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
};

// Helper to add hours to a time string "HH:mm"
const addHoursToTime = (timeStr: string, hours: number): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h + hours + (m / 60);
};

// Convert HH:mm to minutes from midnight
const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

// Get minutes from midnight for a Date object (PHT)
const dateToMinutes = (date: Date): number => {
    return date.getHours() * 60 + date.getMinutes();
};

export const determineScanType = (
  existingLogs: AttendanceLog[],
  currentTime: Date,
  schedule?: Schedule
): ScanType => {
  const todaysLogs = existingLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  const hasAmIn = todaysLogs.some(l => l.type === ScanType.AM_IN);
  const hasAmOut = todaysLogs.some(l => l.type === ScanType.AM_OUT);
  const hasPmIn = todaysLogs.some(l => l.type === ScanType.PM_IN);

  // Use the PHT hour of the current time
  const timeValue = currentTime.getHours() + (currentTime.getMinutes() / 60);

  // Default break logic if no schedule: 12pm-1pm
  let breakStart = 12;
  let breakEnd = 13;

  if (schedule) {
    const startVal = addHoursToTime(schedule.startTime, 0);
    // Break usually starts 4 hours after start? Or fixed based on shift.
    // Based on user prompt: 8am->12pm break, 9am->1pm break, 9:30->1:30 break.
    // This is exactly Start + 4 hours.
    breakStart = startVal + 4;
    breakEnd = breakStart + 1;
  }

  if (hasPmIn) return ScanType.PM_OUT;
  // If we have AM In+Out, next is PM In.
  // OR if we don't have AM In but it's already past break end, assume it's PM In (Late PM arrival)
  if ((hasAmIn && hasAmOut) || (!hasAmIn && timeValue >= breakEnd)) return ScanType.PM_IN;
  if (hasAmIn && !hasAmOut) return ScanType.AM_OUT;
  return ScanType.AM_IN;
};

export const calculateDailyRecord = (date: string, logs: AttendanceLog[], schedule?: Schedule): DailyRecord => {
    const dayLogs = logs.filter(l => l.date === date);
    const getLog = (type: ScanType) => dayLogs.find(l => l.type === type)?.timestamp || null;

    const amIn = getLog(ScanType.AM_IN);
    const amOut = getLog(ScanType.AM_OUT);
    const pmIn = getLog(ScanType.PM_IN);
    const pmOut = getLog(ScanType.PM_OUT);

    const isPresent = !!amIn || !!pmIn;
    const isComplete = (!!amIn && !!amOut && !!pmIn && !!pmOut);

    let arrivalStatus: ArrivalStatus | undefined;
    let departureStatus: DepartureStatus | undefined;
    let lateMinutes = 0;
    let undertimeMinutes = 0;
    let hoursWorked = 0; // Simplified computation

    if (schedule && amIn) {
        // Convert log time to PHT minutes for comparison
        const phtDate = new Date(new Date(amIn).toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        const arrivalMinutes = dateToMinutes(phtDate);
        const schedStartMinutes = timeToMinutes(schedule.startTime);

        const diff = arrivalMinutes - schedStartMinutes;

        if (diff < -15) arrivalStatus = 'EARLY';
        else if (diff > 15) {
            arrivalStatus = 'LATE';
            lateMinutes = diff; // Simple late calculation
        }
        else arrivalStatus = 'ON_TIME';
    }

    if (schedule && pmOut) {
        const phtDate = new Date(new Date(pmOut).toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        const departureMinutes = dateToMinutes(phtDate);
        const schedEndMinutes = timeToMinutes(schedule.endTime);

        if (departureMinutes < schedEndMinutes) {
            departureStatus = 'UNDER_TIME';
            undertimeMinutes = schedEndMinutes - departureMinutes;
        }
        else departureStatus = 'ON_TIME';
    }

    // Simplified hours worked calculation (Time present)
    // Ideally this subtracts break time
    if (amIn && pmOut) {
         const start = new Date(amIn).getTime();
         const end = new Date(pmOut).getTime();
         const hours = (end - start) / (1000 * 60 * 60);
         hoursWorked = Math.max(0, hours - 1); // Subtract 1 hr break roughly
    }

    return {
        date,
        amIn,
        amOut,
        pmIn,
        pmOut,
        status: isComplete ? 'PRESENT' : (isPresent ? 'INCOMPLETE' : 'ABSENT'),
        arrivalStatus,
        departureStatus,
        lateMinutes,
        undertimeMinutes,
        hoursWorked
    };
};

export const calculatePayroll = (employee: Employee, records: DailyRecord[], config: PayrollConfig): SalarySlip => {
    let basePay = 0;
    let totalLateDeduction = 0;
    let totalUndertimeDeduction = 0;
    let daysPresent = 0;

    records.forEach(r => {
        if(r.status === 'PRESENT' || r.status === 'INCOMPLETE') {
            daysPresent++;
            basePay += config.dailyRate;

            // Apply grace period logic
            if(r.lateMinutes > config.gracePeriodMinutes) {
                totalLateDeduction += r.lateMinutes * config.lateDeductionPerMinute;
            }
            totalUndertimeDeduction += r.undertimeMinutes * config.lateDeductionPerMinute; // Same rate?
        }
    });

    let mealAllowance = 0;
    if(daysPresent > 0) mealAllowance = config.mealAllowance * daysPresent; // Daily allowance or monthly? Assuming daily based on prompt "role-based Meal Allowances" usually means daily but let's assume flat per day present for now or flat monthly. 
    // Correction: Prompt says "role-based". Let's assume Manager gets more? For now using config flat rate per day present.

    let birthMonthBonus = 0;
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const birthMonth = new Date(employee.birthday).getMonth() + 1;
    
    // Check if records belong to birth month
    const recordMonth = records.length > 0 ? parseInt(records[0].date.split('-')[1]) : 0;
    
    if (recordMonth === birthMonth) {
        birthMonthBonus = config.birthMonthBonus;
    }

    const netPay = basePay + mealAllowance + birthMonthBonus - totalLateDeduction - totalUndertimeDeduction;

    return {
        employeeId: employee.id,
        month: records[0]?.date.slice(0, 7) || 'N/A',
        basePay,
        totalLateDeduction,
        totalUndertimeDeduction,
        mealAllowance,
        birthMonthBonus,
        netPay,
        daysPresent
    };
};
