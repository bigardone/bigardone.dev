export default function Heading({ text }) {
  return (
    <div className="mb-16 text-3xl font-black text-purple-1000 ">
      <span className="inline-block py-6 border-b-8 border-purlpe-200">
        {text}
      </span>
    </div>
  );
}
