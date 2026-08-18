import type { Profile } from '@a-la-mano/db';

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile | null;
}
