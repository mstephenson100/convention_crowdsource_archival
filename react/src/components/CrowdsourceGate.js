import React, { useState, useEffect } from "react";
import CrowdsourceEditing from "./CrowdsourceEditing";
//import { Link } from 'react-router-dom';


function CrowdsourceGate() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) setLoggedIn(true);
  }, []);
      
  return loggedIn ? <CrowdsourceEditing /> : <p>You must log in from the homepage to access editing tools.</p>;
}

export default CrowdsourceGate;

