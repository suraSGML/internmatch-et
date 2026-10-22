'use client';

import { createContext, useContext } from 'react';

export type CompanyVerificationState = {
  name: string;
  status: 'pending' | 'rejected';
  reviewNote: string | null;
};

const CompanyVerificationContext = createContext<CompanyVerificationState | null>(null);

export function CompanyVerificationProvider({
  value,
  children,
}: {
  value: CompanyVerificationState | null;
  children: React.ReactNode;
}) {
  return (
    <CompanyVerificationContext.Provider value={value}>
      {children}
    </CompanyVerificationContext.Provider>
  );
}

export function useCompanyVerification() {
  return useContext(CompanyVerificationContext);
}
