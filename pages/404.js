/* eslint-disable import/no-extraneous-dependencies */
import Image from 'next/image';

export default function FourOhFour() {
  return (
    <div className="mb-auto font-sans">
      <section className="flex flex-col items-center justify-center w-full max-w-6xl px-4 mx-auto">
        <h1 className="my-8 mb-12 text-4xl font-black text-purple-1000">Page Not Found</h1>
        <div className="w-3/4 md:w-auto">
          <Image
            src="/images/bigardone.svg"
            width={400}
            height={400}
            priority
            alt="bigardone.dev"
            unoptimized
          />
        </div>
      </section>
    </div>
  );
}
