// src/libs/supabase.ts
import { createClient } from '@supabase/supabase-js'
// import { SUPABASE_SERVICE_ROLE, SUPABASE_URL } from './env'


export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!)