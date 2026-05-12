import type { Profile } from '@evalencia-stack/db';

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile | null;
}
