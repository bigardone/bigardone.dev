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
    <header className="w-full max-w-6xl px-4 mx-auto">
      <div className="flex flex-row items-center justify-between py-6 mx-auto md:flex-no-wrap">
        <div className="flex-1">
          <a className="" href="/">
            <Image
              src="/images/logo.svg"
              width={70}
              height={50}
              priority
              alt="bigardone.dev"
              unoptimized
            />
          </a>
        </div>

        <div className="flex flex-row flex-1">
          <ul
            className="flex flex-row justify-end w-full text-sm gap-x-4"
          >
            {[
              { title: 'Home', route: '/' },
              { title: 'Articles', route: '/blog' },
            ].map(({ route, title }) => (
              <li className="ml-6" key={title}>
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
      </div>
    </header>
  );
}
