// app/layout.js
export const metadata = {
  title: 'Sistema de Ventas',
  description: 'Sistema de gestión de ventas de cerveza',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}