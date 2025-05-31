const handleRegularLogin = async (e) => {
  e.preventDefault();
  
  try {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    const response = await axios.post(`${API_URL}/users/login`, {
      email: email.trim(),
      password: password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    }
  } catch (err) {
    setError(err.response?.data?.message || 'Login failed. Please try again.');
    console.error('Regular login error:', err.response?.data || err.message);
  }
};