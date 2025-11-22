import React from 'react';
import { Logo } from '../common/Logo';
import { SocialIcon } from './SocialMediaLinks';
import { FaFacebook, FaGithub, FaInstagram, FaRegCopyright } from 'react-icons/fa';

export const Footer: React.FC = () => {
  return (
    <footer className="container min-w-screen mt-12 md:mt-16 py-6 md:py-8 border-t border-text-secondary/20">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-8 max-w-7xl">
        {/* Main Footer Container */}
        <div className="flex flex-col gap-8 sm:gap-10 lg:gap-12">
          {/* Top Section */}
          <div className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-6 sm:gap-8 md:gap-12 lg:gap-[437px]">
            {/* Left Section */}
            <div className="flex flex-col gap-4 w-full max-w-full lg:w-[346px] lg:h-[58px]">
              {/* Logo + Yourname container */}
              <div className="flex items-center gap-2.5 sm:gap-4 lg:gap-6">
                <div className="text-foreground shrink-0">
                  <Logo />
                </div>
                {/* Yourname text */}
                <span className="text-foreground text-base leading-[21px] font-medium whitespace-nowrap">
                  Your name
                </span>
              </div>
              
              {/* Description */}
              <p className="text-foreground text-base leading-[21px] w-full max-w-full lg:w-[346px]">
                I am a pentester and ethical hacker
              </p>
            </div>

            {/* Right Section */}
            <div className="flex flex-col gap-3 w-full sm:w-auto lg:w-[112px] lg:h-[75px]">
              {/* Media title */}
              <h3 className="text-foreground text-base leading-[31px] font-medium w-auto lg:w-[72px]">
                Media
              </h3>
              
              {/* Social icons */}
              <div className="flex items-center gap-2 w-full sm:w-auto lg:w-[112px] lg:h-[32px]">
                <SocialIcon href="https://facebook.com" ariaLabel="Facebook">
                  <FaFacebook size={28} />
                </SocialIcon>

                {/* Instagram */}
                <SocialIcon href="https://instagram.com" ariaLabel="Instagram">
                  <FaInstagram size={28} />
                </SocialIcon>

                {/* Github */}
                <SocialIcon href="https://github.com" ariaLabel="GitHub">
                  <FaGithub size={28} />
                </SocialIcon>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex justify-center">
            <p className="text-text-secondary text-base leading-[21px] max-w-full">
              <FaRegCopyright className="inline-block mr-1" /> Copyright 2022. Made by Yourname
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
