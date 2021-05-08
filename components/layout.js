import Header from './header';
import Footer from './footer';

export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 px-4 py-6 mx-auto lg:container md:px-6 md:py-12">
        {children}
      </main>
      <Footer />
    </div>
  );
}
