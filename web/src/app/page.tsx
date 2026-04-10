import { headers } from 'next/headers';
import GenericLanding from '@/components/GenericLanding';
import FacilitySearch from '@/components/FacilitySearch';

export default async function Home() {
  // Get hostname from request headers
  const headersList = headers();
  const hostname = headersList.get('host') || '';
  
  // Determine which content to show based on hostname
  const isAppDomain = hostname.includes('app.tankid.io') || 
                      hostname.includes('tankid-app.fly.dev');
  
  const isWwwDomain = hostname.includes('www.tankid.io') || 
                      hostname.includes('tankid-website.fly.dev');
  
  // For development and other scenarios, default to facility search
  const shouldShowLanding = isWwwDomain && !isAppDomain;
  
  // Render appropriate component
  if (shouldShowLanding) {
    return <GenericLanding />;
  } else {
    return <FacilitySearch />;
  }
}