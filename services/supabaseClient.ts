import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fjojmrjimmxidgwbqjzi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2ptcmppbW14aWRnd2JxanppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTAwNDMsImV4cCI6MjA3OTkyNjA0M30.ug4L4dYfbiZSozhSJta2yGsWmbKxQ1Mj4IOwWPacwxM';

export const supabase = createClient(supabaseUrl, supabaseKey);