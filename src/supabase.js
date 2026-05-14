import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vnqqrssamfddalitchry.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucXFyc3NhbWZkZGFsaXRjaHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTY2NDIsImV4cCI6MjA5NDI5MjY0Mn0.cj57Mt9vsWPzqZEliAyR0agXrNbBoYRRlS5CoQVmA-I'

export const supabase = createClient(supabaseUrl, supabaseKey)
