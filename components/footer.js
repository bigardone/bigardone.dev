/* eslint-disable import/no-extraneous-dependencies */
import Image from 'next/image';


export default function Footer() {
  return (
    <footer className="pt-2 pb-6 text-gray-600 md:pb-12 md:pt-0 bg-gray-50">
      <div className="flex flex-row justify-between w-full max-w-6xl px-4 mx-auto text-sm align-middle md:px-0">
        <div className="w-3/5 md:w-9/12">
          bigardone.dev ©
          {' '}
          {new Date().getFullYear()}
        </div>
        <div className="flex flex-row justify-end w-2/5 gap-x-10 md:w-2/12">
          <a className="flex-1 block text-right" href="https://github.com/bigardone" target="_blank>">
            <Image
              src="/images/github.svg"
              width={24}
              height={24}
              priority
              alt="bigardone.dev"
              unoptimized
            />
          </a>
          <a className="flex-1 block text-right" href="https://twitter.com/bigardone" target="_blank>">
            <Image
              src="/images/twitter.svg"
              width={24}
              height={24}
              priority
              alt="bigardone.dev"
              unoptimized
            />
          </a>
          <a className="flex-1 block text-right" href="https://www.linkedin.com/in/ricardogarciavega/" target="_blank>">
            <Image
              src="/images/linkedin.svg"
              width={24}
              height={24}
              priority
              alt="bigardone.dev"
              unoptimized
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
