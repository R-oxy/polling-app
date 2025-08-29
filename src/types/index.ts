export interface Poll {
  id: string;
  question: string;
  options: string[];
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface Vote {
  id?: string;
  poll_id: string;
  option: string;
  voter_id?: string; // Optional for anonymous
  created_at?: string;
}

export interface User {
  id: string;
  email: string;
  created_at?: string;
}
