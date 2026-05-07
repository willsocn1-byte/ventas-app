'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [modoRegistro, setModoRegistro] = useState(false);
  const [sesionActual, setSesionActual] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [mostrarAdmin, setMostrarAdmin] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [permisosUsuario, setPermisosUsuario] = useState(null);

  // Verificar si hay sesión activa
  useEffect(() => {
    verificarSesion();
    cargarPermisos();
  }, []);

  const verificarSesion = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setSesionActual(session.user);
      await cargarUsuarios(session.user);
    }
  };

  const cargarPermisos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', user.id)
        .single();
      
      if (perfil) {
        const { data: permisos } = await supabase
          .from('permisos')
          .select('*')
          .eq('rol', perfil.rol)
          .single();
        setPermisosUsuario(permisos);
        setMostrarAdmin(perfil.rol === 'admin');
      }
    }
  };

  const cargarUsuarios = async (user) => {
    // Solo admin puede ver usuarios
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();
    
    if (perfil?.rol === 'admin') {
      const { data } = await supabase
        .from('perfiles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsuarios(data || []);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error: ${error.message}` });
    } else {
      setMensaje({ tipo: 'exito', texto: '✅ Inicio de sesión exitoso!' });
      setTimeout(() => {
        router.push('/ventas');
      }, 1000);
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    if (!nombre.trim()) {
      setMensaje({ tipo: 'error', texto: '❌ Por favor ingresa tu nombre' });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombre
        }
      }
    });

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error: ${error.message}` });
    } else {
      setMensaje({ tipo: 'exito', texto: '✅ Registro exitoso! Ahora puedes iniciar sesión.' });
      setModoRegistro(false);
      setNombre('');
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  };

  const actualizarRolUsuario = async (userId, nuevoRol) => {
    if (!confirm(`¿Estás seguro de cambiar el rol de este usuario a ${nuevoRol}?`)) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('perfiles')
      .update({ rol: nuevoRol, updated_at: new Date() })
      .eq('id', userId);
    
    if (error) {
      setMensaje({ tipo: 'error', texto: `Error: ${error.message}` });
    } else {
      setMensaje({ tipo: 'exito', texto: '✅ Rol actualizado correctamente' });
      await cargarUsuarios(sesionActual);
    }
    setLoading(false);
  };

  const toggleUsuarioActivo = async (userId, activo) => {
    setLoading(true);
    const { error } = await supabase
      .from('perfiles')
      .update({ activo: !activo, updated_at: new Date() })
      .eq('id', userId);
    
    if (error) {
      setMensaje({ tipo: 'error', texto: `Error: ${error.message}` });
    } else {
      setMensaje({ tipo: 'exito', texto: `✅ Usuario ${!activo ? 'activado' : 'desactivado'} correctamente` });
      await cargarUsuarios(sesionActual);
    }
    setLoading(false);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setSesionActual(null);
    setUsuarios([]);
    setMostrarAdmin(false);
  };

  // Si hay sesión activa y es admin, mostrar panel de administración
  if (sesionActual && mostrarAdmin) {
    return (
      <div style={styles.adminContainer}>
        <div style={styles.adminCard}>
          <div style={styles.adminHeader}>
            <h1 style={styles.title}>👑 Panel de Administración</h1>
            <button onClick={cerrarSesion} style={styles.logoutButton}>
              Cerrar Sesión
            </button>
          </div>
          
          {mensaje.texto && (
            <div style={{
              ...styles.mensaje,
              backgroundColor: mensaje.tipo === 'exito' ? '#d4edda' : '#f8d7da',
              color: mensaje.tipo === 'exito' ? '#155724' : '#721c24'
            }}>
              {mensaje.texto}
            </div>
          )}
          
          <div style={styles.statsContainer}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{usuarios.length}</div>
              <div style={styles.statLabel}>Total Usuarios</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {usuarios.filter(u => u.rol === 'admin').length}
              </div>
              <div style={styles.statLabel}>Administradores</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {usuarios.filter(u => u.rol === 'supervisor').length}
              </div>
              <div style={styles.statLabel}>Supervisores</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {usuarios.filter(u => u.rol === 'vendedor').length}
              </div>
              <div style={styles.statLabel}>Vendedores</div>
            </div>
          </div>
          
          <div style={styles.adminSection}>
            <h2 style={styles.sectionTitle}>📋 Gestión de Usuarios</h2>
            <div style={styles.tableContainer}>
              <table style={styles.userTable}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Fecha Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} style={usuario.id === sesionActual.id ? styles.currentUserRow : {}}>
                      <td>{usuario.email}</td>
                      <td>{usuario.nombre || '-'}</td>
                      <td>
                        <select
                          value={usuario.rol}
                          onChange={(e) => actualizarRolUsuario(usuario.id, e.target.value)}
                          style={styles.rolSelect}
                          disabled={usuario.id === sesionActual.id}
                        >
                          <option value="vendedor">Vendedor</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </td>
                      <td>
                        <span style={{
                          ...styles.estadoBadge,
                          backgroundColor: usuario.activo ? '#d4edda' : '#f8d7da',
                          color: usuario.activo ? '#155724' : '#721c24'
                        }}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{new Date(usuario.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => toggleUsuarioActivo(usuario.id, usuario.activo)}
                          style={{
                            ...styles.actionButton,
                            backgroundColor: usuario.activo ? '#dc3545' : '#28a745'
                          }}
                          disabled={usuario.id === sesionActual.id}
                        >
                          {usuario.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <button onClick={() => router.push('/ventas')} style={styles.goToVentasButton}>
            Ir al Sistema de Ventas →
          </button>
        </div>
      </div>
    );
  }

  // Si hay sesión activa pero no es admin, redirigir a ventas
  if (sesionActual && !mostrarAdmin) {
    router.push('/ventas');
    return null;
  }

  // Pantalla de login/registro
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🍺 SHITAKE´N BEER 🍺</h1>
        <h2 style={styles.subtitle}>{modoRegistro ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
        
        {mensaje.texto && (
          <div style={{
            ...styles.mensaje,
            backgroundColor: mensaje.tipo === 'exito' ? '#d4edda' : '#f8d7da',
            color: mensaje.tipo === 'exito' ? '#155724' : '#721c24'
          }}>
            {mensaje.texto}
          </div>
        )}
        
        <form>
          {modoRegistro && (
            <div style={styles.formGroup}>
              <label>Nombre de Usuario</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={styles.input}
                placeholder="Usuario"
                required
              />
            </div>
          )}
          
          <div style={styles.formGroup}>
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="ejemplo@correo.com"
              required
            />
          </div>
          
          <div style={styles.formGroup}>
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>
          
          {modoRegistro ? (
            <>
              <button
                type="submit"
                onClick={handleRegister}
                disabled={loading}
                style={styles.registerButton}
              >
                {loading ? 'Registrando...' : '📝 Registrarse'}
              </button>
              <button
                type="button"
                onClick={() => setModoRegistro(false)}
                style={styles.switchButton}
              >
                ← Volver a Iniciar Sesión
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                onClick={handleLogin}
                disabled={loading}
                style={styles.loginButton}
              >
                {loading ? 'Iniciando...' : '🔐 Iniciar Sesión'}
              </button>
              <button
                type="button"
                onClick={() => setModoRegistro(true)}
                style={styles.switchButton}
              >
                📝 Crear cuenta nueva
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    textAlign: 'center',
    marginBottom: '10px',
    fontSize: '28px',
    color: '#333'
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: '25px',
    fontSize: '18px',
    color: '#666'
  },
  formGroup: {
    marginBottom: '20px'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    marginTop: '5px',
    transition: 'border-color 0.3s'
  },
  loginButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    marginBottom: '10px',
    fontWeight: 'bold'
  },
  registerButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    marginBottom: '10px',
    fontWeight: 'bold'
  },
  switchButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#2196F3',
    border: '1px solid #2196F3',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  mensaje: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '14px'
  },
  // Estilos del panel de administración
  adminContainer: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  adminCard: {
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  adminHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '10px',
    textAlign: 'center',
    border: '1px solid #e0e0e0'
  },
  statNumber: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#333'
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '5px'
  },
  adminSection: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '20px',
    color: '#333',
    marginBottom: '20px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  userTable: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  currentUserRow: {
    backgroundColor: '#e3f2fd'
  },
  rolSelect: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  estadoBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  actionButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white'
  },
  goToVentasButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  }
};

// Agregar estilos globales
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    input:focus {
      outline: none;
      border-color: #4CAF50;
    }
    button:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    .userTable th {
      background-color: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #dee2e6;
    }
    .userTable td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    .userTable tr:hover {
      background-color: #f8f9fa;
    }
  `;
  document.head.appendChild(styleSheet);
}
