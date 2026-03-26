import { supabase } from './supabase';

export async function validateSupabaseConnection() {
  try {
    // Intenta hacer una consulta simple a una tabla (reemplaza 'tu_tabla' con una tabla real)
    const { data, error } = await supabase
      .from('tu_tabla') // Cambia esto por el nombre de una tabla que exista
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error de conexión:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Conexión exitosa a Supabase');
    return { success: true, data };
  } catch (error) {
    console.error('Error inesperado:', error);
    return { success: false, error: error.message };
  }
}