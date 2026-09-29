import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rvupzharaufgeenbthbu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2dXB6aGFyYXVmZ2VlbmJ0aGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NzM4MjIsImV4cCI6MjEwNjI0OTgyMn0.sDbDd1C9aEvvEQU9yp7e_W6FhzgaKl6jf5ry8jNSJnc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
