'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DetallesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [eliminando, setEliminando] = useState(false);
  const [ventaAEliminar, setVentaAEliminar] = useState(null);
  const [userRol, setUserRol] = useState('');
  const [estadisticas, setEstadisticas] = useState({
    porTipo: [],
    porPresentacion: [],
    matrizTipoPresentacion: [],
    matrizMetodosPago: [],
    totalGeneral: 0,
    totalUnidades: 0,
    totalEfectivo: 0,
    totalTransferencia: 0
  });
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroActivo, setFiltroActivo] = useState(true);
  
  // Estados para el modal de comentarios
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [comentario, setComentario] = useState('');
  const [guardandoComentario, setGuardandoComentario] = useState(false);

  // Definición de presentaciones
  const presentaciones = [
    { id: 'Vaso 500 ml', nombre: 'Vaso 500 ml', precio: 4.00 },
    { id: 'Botella 420 ml', nombre: 'Botella 420 ml', precio: 5.00 }
  ];

  // Tipos de cerveza
  const tiposCerveza = ['Negra', 'Rubia', 'Roja', 'Michelada', 'Hidromiel'];

  // Métodos de pago
  const metodosPago = ['efectivo', 'transferencia'];

  const nombresMetodos = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia'
  };

  const coloresMetodos = {
    efectivo: '#4CAF50',
    transferencia: '#2196F3'
  };

  // Colores por tipo
  const coloresPorTipo = {
    'Negra': '#8B4513',
    'Rubia': '#F4A460',
    'Roja': '#CD5C5C',
    'Michelada': '#c21212',
    'Hidromiel': '#ecddd1'
  };

  // Colores por presentación
  const coloresPorPresentacion = {
    'Vaso 500 ml': '#4CAF50',
    'Botella 420 ml': '#2196F3'
  };

  // Función para obtener el inicio del día actual en formato datetime-local
  const obtenerInicioDiaActual = () => {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00`;
  };

  // Función para obtener el fin del día actual
  const obtenerFinDiaActual = () => {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T23:59`;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      // Obtener el rol del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', user.id)
          .single();
        
        if (perfil) {
          setUserRol(perfil.rol);
        }
      }
      
      // Establecer filtro del día actual automáticamente
      const inicioDia = obtenerInicioDiaActual();
      const finDia = obtenerFinDiaActual();
      
      setFechaInicio(inicioDia);
      setFechaFin(finDia);
      setFiltroActivo(true);
      
      // Cargar estadísticas con las fechas del día actual
      await cargarEstadisticas(inicioDia, finDia);
    };
    checkAuth();
  }, []);

  // Función simplificada para manejar fechas
  const ajustarFechaParaFiltro = (datetimeStr) => {
    if (!datetimeStr) return null;
    
    const fechaLocal = new Date(datetimeStr);
    const year = fechaLocal.getFullYear();
    const month = String(fechaLocal.getMonth() + 1).padStart(2, '0');
    const day = String(fechaLocal.getDate()).padStart(2, '0');
    const hours = String(fechaLocal.getHours()).padStart(2, '0');
    const minutes = String(fechaLocal.getMinutes()).padStart(2, '0');
    const seconds = String(fechaLocal.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-05:00`;
  };

  const cargarEstadisticas = async (inicio = null, fin = null) => {
    setLoading(true);
    try {
      let query = supabase
        .from('ventas')
        .select('*');
      
      // Usar las fechas pasadas como parámetro o las del estado
      const fechaInicioUsar = inicio !== null ? inicio : fechaInicio;
      const fechaFinUsar = fin !== null ? fin : fechaFin;
      
      if (filtroActivo && fechaInicioUsar && fechaFinUsar) {
        const inicioFiltro = ajustarFechaParaFiltro(fechaInicioUsar);
        const finFiltro = ajustarFechaParaFiltro(fechaFinUsar);
        
        query = query
          .gte('fecha', inicioFiltro)
          .lte('fecha', finFiltro);
      }
      
      const { data, error } = await query.order('fecha', { ascending: false });
      
      if (error) throw error;
      
      // Inicializar estructuras de datos
      const estadisticasPorTipo = {};
      const estadisticasPorPresentacion = {};
      
      const matriz = {};
      const matrizPagos = {};
      
      tiposCerveza.forEach(tipo => {
        estadisticasPorTipo[tipo] = {
          tipo: tipo,
          totalUnidades: 0,
          totalDinero: 0,
          color: coloresPorTipo[tipo]
        };
        matriz[tipo] = {};
        presentaciones.forEach(presentacion => {
          matriz[tipo][presentacion.id] = {
            unidades: 0,
            dinero: 0
          };
        });
      });
      
      metodosPago.forEach(metodo => {
        matrizPagos[metodo] = {};
        tiposCerveza.forEach(tipo => {
          matrizPagos[metodo][tipo] = {};
          presentaciones.forEach(presentacion => {
            matrizPagos[metodo][tipo][presentacion.id] = {
              unidades: 0,
              dinero: 0
            };
          });
        });
      });
      
      presentaciones.forEach(presentacion => {
        estadisticasPorPresentacion[presentacion.id] = {
          presentacion: presentacion.id,
          nombre: presentacion.nombre,
          precioUnitario: presentacion.precio,
          totalUnidades: 0,
          totalDinero: 0,
          color: coloresPorPresentacion[presentacion.id]
        };
      });
      
      let totalGeneral = 0;
      let totalUnidades = 0;
      let totalEfectivo = 0;
      let totalTransferencia = 0;
      
      data.forEach(venta => {
        const tipo = venta.tipo_cerveza;
        const cantidad = venta.cantidad;
        const presentacion = venta.presentacion;
        const metodo = venta.metodo_pago;
        const total = venta.total || (venta.cantidad * venta.precio_unitario);
        
        if (matriz[tipo] && matriz[tipo][presentacion]) {
          matriz[tipo][presentacion].unidades += cantidad;
          matriz[tipo][presentacion].dinero += total;
          estadisticasPorTipo[tipo].totalUnidades += cantidad;
          estadisticasPorTipo[tipo].totalDinero += total;
        }
        
        if (matrizPagos[metodo] && matrizPagos[metodo][tipo] && matrizPagos[metodo][tipo][presentacion]) {
          matrizPagos[metodo][tipo][presentacion].unidades += cantidad;
          matrizPagos[metodo][tipo][presentacion].dinero += total;
        }
        
        if (estadisticasPorPresentacion[presentacion]) {
          estadisticasPorPresentacion[presentacion].totalUnidades += cantidad;
          estadisticasPorPresentacion[presentacion].totalDinero += total;
        }
        
        if (metodo === 'efectivo') {
          totalEfectivo += total;
        } else if (metodo === 'transferencia') {
          totalTransferencia += total;
        }
        
        totalUnidades += cantidad;
        totalGeneral += total;
      });
      
      const porTipo = Object.values(estadisticasPorTipo)
        .filter(t => t.totalUnidades > 0)
        .sort((a, b) => b.totalDinero - a.totalDinero);
      
      const porPresentacion = Object.values(estadisticasPorPresentacion)
        .filter(t => t.totalUnidades > 0)
        .sort((a, b) => a.presentacion.localeCompare(b.presentacion));
      
      const matrizTipoPresentacion = tiposCerveza.map(tipo => ({
        tipo: tipo,
        color: coloresPorTipo[tipo],
        presentaciones: presentaciones.map(presentacion => ({
          id: presentacion.id,
          nombre: presentacion.nombre,
          unidades: matriz[tipo][presentacion.id]?.unidades || 0,
          dinero: matriz[tipo][presentacion.id]?.dinero || 0
        })),
        totalUnidades: estadisticasPorTipo[tipo]?.totalUnidades || 0,
        totalDinero: estadisticasPorTipo[tipo]?.totalDinero || 0
      })).filter(tipo => tipo.totalUnidades > 0);
      
      const matrizMetodosPago = metodosPago.map(metodo => ({
        metodo: metodo,
        nombre: nombresMetodos[metodo],
        color: coloresMetodos[metodo],
        tipos: tiposCerveza.map(tipo => ({
          tipo: tipo,
          color: coloresPorTipo[tipo],
          presentaciones: presentaciones.map(presentacion => ({
            id: presentacion.id,
            nombre: presentacion.nombre,
            unidades: matrizPagos[metodo][tipo][presentacion.id]?.unidades || 0,
            dinero: matrizPagos[metodo][tipo][presentacion.id]?.dinero || 0
          })),
          totalUnidades: presentaciones.reduce((sum, p) => sum + (matrizPagos[metodo][tipo][p.id]?.unidades || 0), 0),
          totalDinero: presentaciones.reduce((sum, p) => sum + (matrizPagos[metodo][tipo][p.id]?.dinero || 0), 0)
        })).filter(tipo => tipo.totalUnidades > 0),
        totalGeneralUnidades: 0,
        totalGeneralDinero: 0
      }));
      
      matrizMetodosPago.forEach(metodo => {
        metodo.totalGeneralUnidades = metodo.tipos.reduce((sum, tipo) => sum + tipo.totalUnidades, 0);
        metodo.totalGeneralDinero = metodo.tipos.reduce((sum, tipo) => sum + tipo.totalDinero, 0);
      });
      
      setEstadisticas({
        porTipo,
        porPresentacion,
        matrizTipoPresentacion,
        matrizMetodosPago: matrizMetodosPago.filter(m => m.totalGeneralUnidades > 0),
        totalGeneral,
        totalUnidades,
        totalEfectivo,
        totalTransferencia
      });
      
      setVentasRecientes(data);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar las estadísticas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir el modal de comentarios
  const abrirModalComentario = (venta) => {
    setVentaSeleccionada(venta);
    setComentario(venta.comentario || '');
    setModalAbierto(true);
  };

  // Función para guardar el comentario
  const guardarComentario = async () => {
    if (!ventaSeleccionada) return;
    
    setGuardandoComentario(true);
    
    try {
      const { error } = await supabase
        .from('ventas')
        .update({ comentario: comentario.trim() || null })
        .eq('id', ventaSeleccionada.id);
      
      if (error) throw error;
      
      // Actualizar la lista de ventas localmente
      const ventasActualizadas = ventasRecientes.map(venta =>
        venta.id === ventaSeleccionada.id
          ? { ...venta, comentario: comentario.trim() || null }
          : venta
      );
      setVentasRecientes(ventasActualizadas);
      
      alert('✅ Comentario guardado correctamente');
      cerrarModal();
    } catch (error) {
      console.error('Error al guardar comentario:', error);
      alert('❌ Error al guardar el comentario: ' + error.message);
    } finally {
      setGuardandoComentario(false);
    }
  };

  // Función para cerrar el modal
  const cerrarModal = () => {
    setModalAbierto(false);
    setVentaSeleccionada(null);
    setComentario('');
  };

  const aplicarFiltros = () => {
    if (!fechaInicio || !fechaFin) {
      alert('Por favor selecciona ambas fechas (desde y hasta)');
      return;
    }
    
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    if (inicio > fin) {
      alert('La fecha de inicio no puede ser mayor que la fecha de fin');
      return;
    }
    
    setFiltroActivo(true);
    cargarEstadisticas(fechaInicio, fechaFin);
  };

  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setFiltroActivo(false);
    cargarEstadisticas();
  };

  const eliminarVenta = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta venta? Esta acción no se puede deshacer.')) {
      return;
    }
    
    setEliminando(true);
    setVentaAEliminar(id);
    
    try {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      alert('✅ Venta eliminada correctamente');
      cargarEstadisticas(fechaInicio, fechaFin);
      
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert(`❌ Error al eliminar: ${error.message}`);
    } finally {
      setEliminando(false);
      setVentaAEliminar(null);
    }
  };

  const formatearFecha = (fechaUTC) => {
    if (!fechaUTC) return '';
    const fecha = new Date(fechaUTC);
    return fecha.toLocaleString('es-EC', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearFechaFiltro = (fechaStr) => {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString('es-EC', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loader}>Cargando estadísticas del día actual...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Detalles de Ventas</h1>
        <div style={styles.headerButtons}>
          <button onClick={() => router.push('/ventas')} style={styles.backButton}>
            ← Volver a Ventas
          </button>
        </div>
      </div>

      {/* Filtros de fecha y hora */}
      <div style={styles.filtrosContainer}>
        <div style={styles.filtrosGroup}>
          <div style={styles.filtroItem}>
            <label>Desde (fecha y hora):</label>
            <input
              type="datetime-local"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={styles.filtroInput}
            />
          </div>
          <div style={styles.filtroItem}>
            <label>Hasta (fecha y hora):</label>
            <input
              type="datetime-local"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={styles.filtroInput}
            />
          </div>
          <button onClick={aplicarFiltros} style={styles.aplicarButton}>
            Aplicar Filtro
          </button>
          <button onClick={limpiarFiltros} style={styles.limpiarButton}>
            Limpiar
          </button>
        </div>
        {filtroActivo && (
          <div style={styles.filtroInfo}>
            🔍 Mostrando ventas desde {formatearFechaFiltro(fechaInicio)} hasta {formatearFechaFiltro(fechaFin)}
          </div>
        )}
      </div>

      {/* Tarjetas de resumen */}
      <div style={styles.resumenContainer}>
        <div style={styles.tarjetaTotal}>
          <div style={styles.tarjetaIcon}>💰</div>
          <div style={styles.tarjetaInfo}>
            <div style={styles.tarjetaLabel}>Total General</div>
            <div style={styles.tarjetaValor}>${estadisticas.totalGeneral.toFixed(2)} USD</div>
          </div>
        </div>
        <div style={styles.tarjetaTotal}>
          <div style={styles.tarjetaIcon}>🍺</div>
          <div style={styles.tarjetaInfo}>
            <div style={styles.tarjetaLabel}>Total Unidades Vendidas</div>
            <div style={styles.tarjetaValor}>{estadisticas.totalUnidades} unidades</div>
          </div>
        </div>
        <div style={styles.tarjetaTotal}>
          <div style={styles.tarjetaIcon}>💵</div>
          <div style={styles.tarjetaInfo}>
            <div style={styles.tarjetaLabel}>Efectivo</div>
            <div style={styles.tarjetaValor}>${estadisticas.totalEfectivo.toFixed(2)} USD</div>
          </div>
        </div>
        <div style={styles.tarjetaTotal}>
          <div style={styles.tarjetaIcon}>🏦</div>
          <div style={styles.tarjetaInfo}>
            <div style={styles.tarjetaLabel}>Transferencia</div>
            <div style={styles.tarjetaValor}>${estadisticas.totalTransferencia.toFixed(2)} USD</div>
          </div>
        </div>
      </div>

      {/* MATRIZ: Ventas por Tipo y Presentación */}
      <div style={styles.card}>
        <h2 style={styles.subtitle}>📊 Ventas por Tipo de Cerveza y Presentación</h2>
        <div style={styles.tableContainer}>
          <table style={styles.tableMatriz}>
            <thead>
              <tr>
                <th style={styles.thFixed}>Tipo de Cerveza</th>
                {presentaciones.map(presentacion => (
                  <th key={presentacion.id} style={styles.thPresentacion}>
                    <div style={{ ...styles.presentacionHeader, backgroundColor: coloresPorPresentacion[presentacion.id] }}>
                      {presentacion.nombre}
                      <span style={styles.presentacionPrecio}>${presentacion.precio.toFixed(2)}</span>
                    </div>
                  </th>
                ))}
                <th style={styles.thTotal}>Total Tipo</th>
              </tr>
            </thead>
            <tbody>
              {estadisticas.matrizTipoPresentacion.map((tipo) => (
                <tr key={tipo.tipo}>
                  <td style={{ ...styles.tipoCell, borderLeftColor: tipo.color }}>
                    <span style={styles.tipoNombre}>{tipo.tipo}</span>
                  </td>
                  {tipo.presentaciones.map((presentacion) => (
                    <td key={presentacion.id} style={styles.cellPresentacion}>
                      {presentacion.unidades > 0 ? (
                        <div style={styles.cellContent}>
                          <div style={styles.unidadesNumber}>{presentacion.unidades} und</div>
                          <div style={styles.dineroNumber}>${presentacion.dinero.toFixed(2)}</div>
                        </div>
                      ) : (
                        <div style={styles.cellEmpty}>—</div>
                      )}
                    </td>
                  ))}
                  <td style={styles.cellTotalTipo}>
                    <div style={styles.totalTipoContent}>
                      <div style={styles.totalUnidades}>{tipo.totalUnidades} und</div>
                      <div style={styles.totalDinero}>${tipo.totalDinero.toFixed(2)}</div>
                    </div>
                  </td>
                </tr>
              ))}
              {estadisticas.matrizTipoPresentacion.length === 0 && (
                <tr>
                  <td colSpan={presentaciones.length + 2} style={styles.noData}>
                    No hay datos disponibles
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={styles.footerRow}>
                <td style={styles.footerCell}>Total por Presentación</td>
                {estadisticas.porPresentacion.map((presentacion) => (
                  <td key={presentacion.presentacion} style={styles.footerCell}>
                    <div style={styles.cellContent}>
                      <div style={styles.unidadesNumber}>{presentacion.totalUnidades} und</div>
                      <div style={styles.dineroNumber}>${presentacion.totalDinero.toFixed(2)}</div>
                    </div>
                  </td>
                ))}
                <td style={styles.footerTotalCell}>
                  <div style={styles.totalGeneralContent}>
                    <div>{estadisticas.totalUnidades} und</div>
                    <div>${estadisticas.totalGeneral.toFixed(2)}</div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MATRIZ: Ventas por Método de Pago */}
      <div style={styles.card}>
        <h2 style={styles.subtitle}>💳 Ventas por Método de Pago</h2>
        
        {estadisticas.matrizMetodosPago.map((metodo) => (
          <div key={metodo.metodo} style={styles.metodoSeccion}>
            <h3 style={{ ...styles.metodoTitulo, backgroundColor: metodo.color }}>
              {metodo.nombre}
            </h3>
            <div style={styles.tableContainer}>
              <table style={styles.tableMatriz}>
                <thead>
                  <tr>
                    <th style={styles.thFixed}>Tipo de Cerveza</th>
                    {presentaciones.map(presentacion => (
                      <th key={presentacion.id} style={styles.thPresentacion}>
                        <div style={{ ...styles.presentacionHeaderSmall, backgroundColor: coloresPorPresentacion[presentacion.id] }}>
                          {presentacion.nombre}
                        </div>
                      </th>
                    ))}
                    <th style={styles.thTotal}>Total Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {metodo.tipos.map((tipo) => (
                    <tr key={tipo.tipo}>
                      <td style={{ ...styles.tipoCell, borderLeftColor: tipo.color }}>
                        <span style={styles.tipoNombre}>{tipo.tipo}</span>
                      </td>
                      {tipo.presentaciones.map((presentacion) => (
                        <td key={presentacion.id} style={styles.cellPresentacion}>
                          {presentacion.unidades > 0 ? (
                            <div style={styles.cellContent}>
                              <div style={styles.unidadesNumber}>{presentacion.unidades} und</div>
                              <div style={styles.dineroNumber}>${presentacion.dinero.toFixed(2)}</div>
                            </div>
                          ) : (
                            <div style={styles.cellEmpty}>—</div>
                          )}
                        </td>
                      ))}
                      <td style={styles.cellTotalTipo}>
                        <div style={styles.totalTipoContent}>
                          <div style={styles.totalUnidades}>{tipo.totalUnidades} und</div>
                          <div style={styles.totalDinero}>${tipo.totalDinero.toFixed(2)}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {metodo.tipos.length === 0 && (
                    <tr>
                      <td colSpan={presentaciones.length + 2} style={styles.noData}>
                        No hay ventas con este método
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={styles.footerRow}>
                    <td style={styles.footerCell}>Total {metodo.nombre}</td>
                    {presentaciones.map(presentacion => {
                      const totalPresentacion = metodo.tipos.reduce((sum, tipo) => {
                        const p = tipo.presentaciones.find(t => t.id === presentacion.id);
                        return sum + (p?.dinero || 0);
                      }, 0);
                      const totalUnidadesPresentacion = metodo.tipos.reduce((sum, tipo) => {
                        const p = tipo.presentaciones.find(t => t.id === presentacion.id);
                        return sum + (p?.unidades || 0);
                      }, 0);
                      return (
                        <td key={presentacion.id} style={styles.footerCell}>
                          {totalUnidadesPresentacion > 0 ? (
                            <div style={styles.cellContent}>
                              <div style={styles.unidadesNumber}>{totalUnidadesPresentacion} und</div>
                              <div style={styles.dineroNumber}>${totalPresentacion.toFixed(2)}</div>
                            </div>
                          ) : (
                            <div style={styles.cellEmpty}>—</div>
                          )}
                        </td>
                      );
                    })}
                    <td style={styles.footerTotalCell}>
                      <div style={styles.totalGeneralContent}>
                        <div>{metodo.totalGeneralUnidades} und</div>
                        <div>${metodo.totalGeneralDinero.toFixed(2)}</div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
        
        {estadisticas.matrizMetodosPago.length === 0 && (
          <div style={styles.noData}>No hay datos disponibles</div>
        )}
      </div>

      {/* Últimas Ventas con columna Vendedor y control de permisos */}
      <div style={styles.card}>
        <div style={styles.ventasHeader}>
          <h2 style={styles.subtitle}>🕐 Últimas Ventas</h2>
          <div style={styles.ventasHeaderButtons}>
            <button 
              onClick={() => cargarEstadisticas(fechaInicio, fechaFin)} 
              style={styles.refreshButton}
              title="Actualizar lista"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Vendedor</th>
                <th>Tipo</th>
                <th>Presentación</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Total</th>
                <th>Método Pago</th>
                <th>Comentario</th>
                <th style={styles.accionesHeader}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventasRecientes.map((venta) => (
                <tr key={venta.id}>
                  <td>{formatearFecha(venta.fecha)}</td>
                  <td>
                    <span style={styles.vendedorNombre}>
                      {venta.vendedor_nombre || venta.user_id?.substring(0, 8) || 'N/A'}
                    </span>
                  </td>
                  <td>{venta.tipo_cerveza}</td>
                  <td>{venta.presentacion || 'N/A'}</td>
                  <td>{venta.cantidad}</td>
                  <td>${venta.precio_unitario.toFixed(2)}</td>
                  <td style={styles.dineroCell}>${(venta.total || venta.cantidad * venta.precio_unitario).toFixed(2)}</td>
                  <td>{venta.metodo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}</td>
                  <td style={styles.comentarioCell}>
                    {venta.comentario ? (
                      <div style={styles.comentarioTexto}>
                        <span>{venta.comentario}</span>
                        <button
                          onClick={() => abrirModalComentario(venta)}
                          style={styles.editarComentarioButton}
                          title="Editar comentario"
                        >
                          ✏️
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => abrirModalComentario(venta)}
                        style={styles.agregarComentarioButton}
                      >
                        💬 Agregar comentario
                      </button>
                    )}
                  </td>
                  <td style={styles.accionesCell}>
                    {/* Solo admin puede eliminar */}
                    {userRol === 'admin' ? (
                      <button
                        onClick={() => eliminarVenta(venta.id)}
                        disabled={eliminando && ventaAEliminar === venta.id}
                        style={styles.eliminarButton}
                        title="Eliminar venta"
                      >
                        {eliminando && ventaAEliminar === venta.id ? '⏳' : '🗑️ Eliminar'}
                      </button>
                    ) : (
                      <span style={styles.sinPermiso} title="Solo administradores pueden eliminar">
                        🔒 Solo Admin
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {ventasRecientes.length === 0 && (
                <tr>
                  <td colSpan="10" style={styles.noData}>No hay ventas registradas en el día actual</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de comentarios */}
      {modalAbierto && (
        <div style={styles.modalOverlay} onClick={cerrarModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {ventaSeleccionada?.comentario ? 'Editar Comentario' : 'Agregar Comentario'}
              </h3>
              <button onClick={cerrarModal} style={styles.modalClose}>
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.modalInfo}>
                <p><strong>📅 Fecha:</strong> {ventaSeleccionada && formatearFecha(ventaSeleccionada.fecha)}</p>
                <p><strong>👤 Vendedor:</strong> {ventaSeleccionada?.vendedor_nombre || 'N/A'}</p>
                <p><strong>🍺 Producto:</strong> {ventaSeleccionada?.tipo_cerveza} - {ventaSeleccionada?.presentacion || 'N/A'}</p>
                <p><strong>💰 Total:</strong> ${ventaSeleccionada && (ventaSeleccionada.total || ventaSeleccionada.cantidad * ventaSeleccionada.precio_unitario).toFixed(2)}</p>
              </div>
              <label style={styles.modalLabel}>Comentario:</label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Escribe un comentario sobre esta venta..."
                style={styles.modalTextarea}
                rows="4"
                autoFocus
              />
            </div>
            <div style={styles.modalFooter}>
              <button onClick={cerrarModal} style={styles.modalCancelButton}>
                Cancelar
              </button>
              <button 
                onClick={guardarComentario} 
                style={styles.modalSaveButton}
                disabled={guardandoComentario}
              >
                {guardandoComentario ? 'Guardando...' : 'Guardar Comentario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  headerButtons: {
    display: 'flex',
    gap: '10px'
  },
  title: {
    fontSize: '32px',
    color: '#333',
    margin: 0
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  filtrosContainer: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  filtrosGroup: {
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-end',
    flexWrap: 'wrap'
  },
  filtroItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  filtroInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px'
  },
  aplicarButton: {
    padding: '8px 20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    height: '36px'
  },
  limpiarButton: {
    padding: '8px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    height: '36px'
  },
  filtroInfo: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#e3f2fd',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1976d2',
    textAlign: 'center'
  },
  resumenContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  tarjetaTotal: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  tarjetaIcon: {
    fontSize: '48px'
  },
  tarjetaInfo: {
    flex: 1
  },
  tarjetaLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '5px'
  },
  tarjetaValor: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  subtitle: {
    fontSize: '20px',
    color: '#333',
    marginBottom: '20px',
    marginTop: 0
  },
  tableContainer: {
    overflowX: 'auto'
  },
  tableMatriz: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  thFixed: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '2px solid #dee2e6',
    minWidth: '120px'
  },
  thPresentacion: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    textAlign: 'center',
    borderBottom: '2px solid #dee2e6'
  },
  thTotal: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    textAlign: 'center',
    fontWeight: 'bold',
    borderBottom: '2px solid #dee2e6',
    minWidth: '100px'
  },
  tipoCell: {
    borderLeft: '4px solid',
    padding: '15px',
    backgroundColor: '#fafafa'
  },
  tipoNombre: {
    fontWeight: 'bold',
    fontSize: '16px'
  },
  cellPresentacion: {
    textAlign: 'center',
    padding: '12px',
    borderBottom: '1px solid #eee',
    verticalAlign: 'middle'
  },
  cellContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  unidadesNumber: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333'
  },
  dineroNumber: {
    fontSize: '14px',
    color: '#2e7d32',
    fontWeight: '500'
  },
  cellEmpty: {
    color: '#ccc',
    fontSize: '14px'
  },
  cellTotalTipo: {
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    padding: '12px',
    borderBottom: '1px solid #eee',
    fontWeight: 'bold'
  },
  totalTipoContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  totalUnidades: {
    fontSize: '14px',
    color: '#666'
  },
  totalDinero: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2e7d32'
  },
  footerRow: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold'
  },
  footerCell: {
    padding: '12px',
    textAlign: 'center',
    borderTop: '2px solid #dee2e6'
  },
  footerTotalCell: {
    padding: '12px',
    textAlign: 'center',
    borderTop: '2px solid #dee2e6',
    backgroundColor: '#e8f5e9'
  },
  totalGeneralContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontWeight: 'bold'
  },
  presentacionHeader: {
    padding: '8px',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  presentacionHeaderSmall: {
    padding: '6px',
    borderRadius: '6px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  presentacionPrecio: {
    fontSize: '12px',
    opacity: 0.9,
    display: 'block'
  },
  metodoSeccion: {
    marginBottom: '30px'
  },
  metodoTitulo: {
    padding: '12px 20px',
    borderRadius: '10px',
    color: 'white',
    marginBottom: '15px',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  dineroCell: {
    color: '#2e7d32',
    fontWeight: 'bold'
  },
  comentarioCell: {
    maxWidth: '250px',
    padding: '12px'
  },
  comentarioTexto: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    backgroundColor: '#fff3e0',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#e65100'
  },
  editarComentarioButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 5px',
    borderRadius: '4px',
    transition: 'background-color 0.3s'
  },
  agregarComentarioButton: {
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f5f5f5'
  },
  loader: {
    fontSize: '18px',
    color: '#666'
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    color: '#999'
  },
  ventasHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  ventasHeaderButtons: {
    display: 'flex',
    gap: '10px'
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  accionesHeader: {
    textAlign: 'center',
    width: '100px'
  },
  accionesCell: {
    textAlign: 'center'
  },
  eliminarButton: {
    padding: '6px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s'
  },
  sinPermiso: {
    fontSize: '11px',
    color: '#999',
    fontStyle: 'italic'
  },
  vendedorNombre: {
    fontWeight: '500',
    color: '#4a6741',
    backgroundColor: '#e8f5e9',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    display: 'inline-block'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0'
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    color: '#333'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background-color 0.3s'
  },
  modalBody: {
    padding: '20px'
  },
  modalInfo: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  modalLabel: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#333'
  },
  modalTextarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '20px',
    borderTop: '1px solid #e0e0e0'
  },
  modalCancelButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  modalSaveButton: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  }
};

// Agregar estilos globales
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    th, td {
      border-bottom: 1px solid #eee;
    }
    tr:hover {
      background-color: #f8f9fa;
    }
    .tableMatriz tr:hover td {
      background-color: #f8f9fa;
    }
    input[type="datetime-local"] {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .editarComentarioButton:hover {
      background-color: #e0e0e0;
    }
    .agregarComentarioButton:hover {
      background-color: #1976d2;
    }
    .modalClose:hover {
      background-color: #f0f0f0;
    }
  `;
  document.head.appendChild(styleSheet);
}
