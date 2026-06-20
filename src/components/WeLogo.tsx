import React from "react";

export default function WeLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 500 500" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      id="we-corporate-logo"
    >
      {/* Official WE Purple Background Circle */}
      <circle cx="250" cy="250" r="250" fill="#5E2390" />
      
      {/* High Fidelity Stylized lowercase 'w' matching WE brand */}
      <path 
        d="M125 180 V245 C125 285 145 300 180 300 C215 300 230 285 230 245 V180 M230 245 C230 285 250 300 285 300 C320 300 338 285 338 245 V180" 
        stroke="white" 
        strokeWidth="38" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* High Fidelity Stylized lowercase 'e' matching WE brand */}
      <path 
        d="M375 240 C375 200 395 180 425 180 C455 180 470 200 470 240 C470 280 455 298 425 298 C395 298 375 280 375 240 Z" 
        stroke="white" 
        strokeWidth="38" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Horizontal horizontal line for lowercase 'e' */}
      <path 
        d="M375 240 H468" 
        stroke="white" 
        strokeWidth="38" 
        strokeLinecap="round" 
      />
    </svg>
  );
}
