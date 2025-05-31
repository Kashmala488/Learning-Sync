const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
  authApiUrl: process.env.REACT_APP_AUTH_API_URL || 'http://localhost:4001/api/auth',
  googleClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '441572137222-ecsu4p53mv9s0t97th9rqu6ptj0lahlv.apps.googleusercontent.com'
};

// Verify configuration
const verifyConfig = () => {
  const missingVars = [];
  
  if (!config.apiUrl) missingVars.push('REACT_APP_API_URL');
  if (!config.authApiUrl) missingVars.push('REACT_APP_AUTH_API_URL');
  if (!config.googleClientId) missingVars.push('REACT_APP_GOOGLE_CLIENT_ID');
  
  if (missingVars.length > 0) {
    console.error('Missing environment variables:', missingVars.join(', '));
  } else {
    console.log('Configuration loaded successfully:', {
      apiUrl: config.apiUrl,
      authApiUrl: config.authApiUrl,
      googleClientId: config.googleClientId.substring(0, 8) + '...'
    });
  }
};

verifyConfig();

export default config; 