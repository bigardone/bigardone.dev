/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/button-has-type */
import { useState } from 'react';
import cn from 'classnames';
import Image from 'next/image';
import { useRouter } from 'next/router';

export default function Header() {
  const [mobileMenuIsOpen, setMobileMenuIsOpen] = useState(false);
  const router = useRouter();

  return (
    <header className="w-full max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between py-6 mx-auto lg:container md:flex-no-wrap">
        <div className="flex items-center">
          <a className="font-extrabold text-purple-800 hover:text-purple-600 transition-colors" href="/">
            <Image
              src="/images/logo.svg"
              width={140}
              height={70}
              priority
              alt="bigardone.dev"
              unoptimized
            />
          </a>
        </div>

        <button
          className="flex items-center block px-3 py-2 border border-white rounded to-gray-500 md:hidden"
          onClick={() => setMobileMenuIsOpen(!mobileMenuIsOpen)}
        >
          <svg
            className="w-3 h-3 fill-current"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Menu</title>
            <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
          </svg>
        </button>

        <ul
          className={cn(
            'md:flex flex-col md:flex-row md:items-center md:justify-center text-sm w-full md:w-auto',
            mobileMenuIsOpen ? 'block' : 'hidden',
          )}
        >
          {[
            { title: 'Home', route: '/' },
            { title: 'Articles', route: '/blog' },
          ].map(({ route, title }) => (
            <li className="mt-3 md:mt-0 md:ml-6" key={title}>
              <a
                href={route}
                className={cn({
                  'block font-sans font-black text-black hover:text-purple-600 transition-colors': true,
                  'text-purple-900': route === router.asPath,
                })}
              >
                {title}

              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
