'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import Link from 'next/link';

const MainHeader = () => {
  const session = useSession();
  const router = typeof window !== 'undefined' ? useRouter() : null;

  /**
   * Modals state
   */
  const [isSuiteDialogOpen, setIsSuiteDialogOpen] = useState(false);
  const [isWalkinsDialogOpen, setIsWalkinsDialogOpen] = useState(false);
  const [isFaqsDialogOpen, setIsFaqsDialogOpen] = useState(false);
  const [isMyTeamDialogOpen, setIsMyTeamDialogOpen] = useState(false);
  const [isConferenceScheduleDialogOpen, setIsConferenceScheduleDialogOpen] = useState(false);

  if (!router) return null;

  if (session?.status !== 'authenticated' || !session?.data?.user) {
    return null;
  }

  const headerColor = ['ATTENDEE', 'ATTENDEE_ADMIN'].includes(session?.data?.user?.role)
    ? '#5a872f'
    : '#132e47';

  return (
    <>
      <header
        className='bg-white shadow p-4 flex justify-end h-24 relative'
        style={{ background: headerColor }}>
        <div className='flex w-full'>
          {session?.data?.user?.role !== 'ADMIN' ? (
            <div className='w-[80px] h-[74px] rounded-full bg-white overflow-hidden flex items-center justify-center mt-[-4px] ml-4'>
              <div className='w-full h-full relative'>
                <a href='https://forummakers.com/' target='_blank'>
                  <img
                    src='/forum_makers_transparent.png'
                    alt='Forummakers Logo'
                    className='absolute w-[120%] h-[120%] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-cover'
                  />
                </a>
              </div>
            </div>
          ) : null}

          {/* LOGO */}
          <div className='absolute left-1/2 transform -translate-x-1/2 top-0 z-20'>
            <Link href={'/'} title='Express Connect Home'>
              <Image
                src='/express-connect-logo.png'
                alt='Express Connect Logo'
                width={140}
                height={140}
                className='z-10'
              />
            </Link>
          </div>
          <div className='flex w-full justify-end'>
            {/* ROLE: ATTENDEES */}
            {['ATTENDEE', 'ATTENDEE_ADMIN'].includes(session?.data?.user?.role) ? (
              <>
              </>
            ) : null}

            {/* ROLE: HOSTS */}
            {['HOST', 'HOST_ADMIN', 'HOST_TEAM_MEMBER'].includes(session?.data?.user?.role) ? (
              <>
              </>
            ) : null}

            {/* SIGN OUT */}
            <div
              className='flex flex-col items-center border-white hover:opacity-50 hover:cursor-pointer mr-4'
              onClick={() => {
                signOut({
                  redirect: true,
                });
              }}>
              <LogOut className='mr-4 my-auto text-white' />
              <div className='mr-4 my-auto text-white text-sm'>SIGN OUT</div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default MainHeader;
