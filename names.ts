// names.ts — Unique realistic Indian city citizen names and gender roster

import type { Gender } from './types';

export interface NameEntry {
  name: string;
  gender: Gender;
}

export const CITIZEN_NAME_POOL: NameEntry[] = [
  { name: 'Aarav Deshmukh', gender: 'Male' },
  { name: 'Priya Nair', gender: 'Female' },
  { name: 'Vikram Kulkarni', gender: 'Male' },
  { name: 'Ananya Iyer', gender: 'Female' },
  { name: 'Rohan Sharma', gender: 'Male' },
  { name: 'Kavya Menon', gender: 'Female' },
  { name: 'Siddharth Patel', gender: 'Male' },
  { name: 'Meera Joshi', gender: 'Female' },
  { name: 'Arjun Reddy', gender: 'Male' },
  { name: 'Sneha Gupta', gender: 'Female' },
  { name: 'Aditya Rao', gender: 'Male' },
  { name: 'Nandini Verma', gender: 'Female' },
  { name: 'Karan Malhotra', gender: 'Male' },
  { name: 'Divya Krishnan', gender: 'Female' },
  { name: 'Nikhil Bansal', gender: 'Male' },
  { name: 'Ishita Chatterjee', gender: 'Female' },
  { name: 'Pranav Gokhale', gender: 'Male' },
  { name: 'Riya Sengupta', gender: 'Female' },
  { name: 'Devansh Mehta', gender: 'Male' },
  { name: 'Tanvi Kapoor', gender: 'Female' },
  { name: 'Harshvardhan Singh', gender: 'Male' },
  { name: 'Pooja Bhatia', gender: 'Female' },
  { name: 'Varun Subramanian', gender: 'Male' },
  { name: 'Aishwarya Shetty', gender: 'Female' },
  { name: 'Kabir Chawla', gender: 'Male' },
  { name: 'Shreya Pillai', gender: 'Female' },
  { name: 'Manish Tiwari', gender: 'Male' },
  { name: 'Neha Agarwal', gender: 'Female' },
  { name: 'Saurabh Mishra', gender: 'Male' },
  { name: 'Aditi Kulkarni', gender: 'Female' },
  { name: 'Kiran Deshpande', gender: 'Non-Binary' },
  { name: 'Ritika Bose', gender: 'Female' },
  { name: 'Rahul Saxena', gender: 'Male' },
  { name: 'Lakshmi Narayan', gender: 'Female' },
  { name: 'Vivek Hegde', gender: 'Male' },
  { name: 'Pallavi Kamath', gender: 'Female' },
  { name: 'Gaurav Chauhan', gender: 'Male' },
  { name: 'Swati Bhardwaj', gender: 'Female' },
  { name: 'Deepak Nair', gender: 'Male' },
  { name: 'Sana Qureshi', gender: 'Female' },
  { name: 'Sameer Mirza', gender: 'Male' },
  { name: 'Shilpa Hegde', gender: 'Female' },
  { name: 'Tarun Khanna', gender: 'Male' },
  { name: 'Maya Venkatesh', gender: 'Female' },
  { name: 'Omkar Sawant', gender: 'Male' },
  { name: 'Anjali Kulkarni', gender: 'Female' },
  { name: 'Rishi Talwar', gender: 'Non-Binary' },
  { name: 'Bhavna Chauhan', gender: 'Female' },
  { name: 'Yashwant Rao', gender: 'Male' },
  { name: 'Zoya Merchant', gender: 'Female' },
  { name: 'Kunal Phadke', gender: 'Male' },
  { name: 'Nitya Raghavan', gender: 'Female' },
  { name: 'Ashwin Parekh', gender: 'Male' },
  { name: 'Rekha Sundaram', gender: 'Female' },
];

export function shuffleNames(pool: NameEntry[]): NameEntry[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
