/* eslint-disable import/no-extraneous-dependencies */
import Image from 'next/image';


export default function Footer() {
  return (
    <footer className="pb-12 text-gray-600 bg-gray-50">
      <div className="flex flex-row justify-between w-full max-w-6xl mx-auto text-sm text-center align-middle">
        <div>
          bigardone.dev ©
          {' '}
          {new Date().getFullYear()}
        </div>
        <div className="flex flex-row gap-x-6">
          <a href="https://github.com/bigardone" target="_blank>">
            <Image
              src="/images/github.svg"
              width={24}
              height={24}
              priority
              alt="bigardone.dev"
              unoptimized
            />
          </a>
          <a href="https://twitter.com/bigardone" target="_blank>">
            <Image
              src="/images/twitter.svg"
              width={24}
              height={24}
              priority
              alt="bigardone.dev"
              unoptimized
            />
          </a>
          <a href="https://www.linkedin.com/in/ricardogarciavega/" target="_blank>">
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
