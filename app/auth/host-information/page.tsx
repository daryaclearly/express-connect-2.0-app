import HostInfoComponent from '@/app/components/HostInfoComponent';

const HostInformationPage = () => {
  return (
    <div className='flex min-h-screen w-full' suppressHydrationWarning>
      <HostInfoComponent isMobile={true} />
    </div>
  );
};

export default HostInformationPage;
