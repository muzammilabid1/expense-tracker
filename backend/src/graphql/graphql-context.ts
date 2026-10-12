export type GraphqlRequestContext = {
  req: {
    headers: {
      authorization?: string;
      cookie?: string;
    };
    user?: { sub: number; email: string; sid: string };
  };
  res: {
    cookie: (
      name: string,
      value: string,
      options: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'lax' | 'none';
        path: string;
        maxAge: number;
      },
    ) => void;
    clearCookie: (
      name: string,
      options: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'lax' | 'none';
        path: string;
      },
    ) => void;
  };
};
