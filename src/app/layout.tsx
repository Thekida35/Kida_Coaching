/** L'app est servie depuis public/app.html ; ce layout ne sert qu'aux pages Next (404). */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
