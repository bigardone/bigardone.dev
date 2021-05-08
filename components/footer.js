export default function Footer() {
  return (
    <footer className="bg-gray-800">
      <div className="flex items-center justify-between px-4 py-6 mx-auto text-sm text-white lg:container md:px-6">
        <div>
          bigardone.dev ©
          {' '}
          {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
