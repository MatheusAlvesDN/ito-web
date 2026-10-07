import React from 'react';

export type BaseTheme = {
  id: string;
  original_theme_id?: string;
  game_id?: string;
  name: string;
  description: string;
  color: string;
  textColor: string;
  buttonColor?: string;
  icon: React.ElementType | string;
};

export type Theme = BaseTheme;

export type ImpostorScenario = {
  id?: number;
  honest: string;
  impostorVariations: string[];
};

export type WhatDoYouKnowTheme = BaseTheme & {
  questions?: string[];
};

export type WhoAmITheme = BaseTheme & {
  personalities?: string[];
};
