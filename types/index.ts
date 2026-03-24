export interface User {
  id: string;
  email: string;
  role: "USER" | "VERIFIER" | "ADMIN";
  createdAt: Date;
}

export interface Family {
  id: string;
  userId: string;
  // Split name fields for head
  firstName: string;
  middleName?: string | null;
  lastName: string;
  // Father info
  fatherFirstName?: string | null;
  fatherMiddleName?: string | null;
  fatherLastName?: string | null;
  fatherId?: string;
  // Mother info
  motherFirstName?: string | null;
  motherMiddleName?: string | null;
  motherLastName?: string | null;
  motherId?: string;
  // Person links
  headPersonId?: string;
  // Existing fields
  education?: string;
  occupationType?: "Job" | "Business" | "Unoccupied";
  occupationLocation?: string;
  gender: "Male";
  maritalStatus: "Single" | "Married" | "Widowed" | "Divorced";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Spouse {
  id: string;
  familyId: string;
  // Split name fields
  firstName: string;
  middleName?: string | null;
  lastName: string;
  // Father info
  fatherFirstName?: string | null;
  fatherMiddleName?: string | null;
  fatherLastName?: string | null;
  // Mother info
  motherFirstName?: string | null;
  motherMiddleName?: string | null;
  motherLastName?: string | null;
  // Person link
  personId?: string;
  isDeceased?: boolean;
  // Existing fields
  education?: string;
  occupationType?: "Job" | "Business" | "Unoccupied" | "House Wife";
  occupationLocation?: string;
  gender: "Female";
}

export interface Child {
  id: string;
  familyId: string;
  // Split name fields
  firstName: string;
  middleName?: string | null;
  lastName: string;
  // Person link
  personId?: string;
  // Existing fields
  gender: "Male" | "Female" | "Other";
  education?: string;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  location?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  likes: Like[];
  _count?: {
    likes: number;
    comments: number;
  };
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  replies?: Comment[];
  _count?: {
    replies: number;
  };
}

export interface Like {
  id: string;
  userId: string;
  postId: string;
  user: User;
  post: Post;
}

export interface FamilyFormData {
  // Head of family (split names)
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth?: string;
  // Optional personId for head (when selecting from autocomplete)
  headPersonId?: string;
  // Father info (split names)
  fatherFirstName: string;
  fatherMiddleName: string;
  fatherLastName: string;
  fatherDateOfBirth?: string;
  fatherId?: string;
  // Mother info (split names)
  motherFirstName: string;
  motherMiddleName: string;
  motherLastName: string;
  motherDateOfBirth?: string;
  motherId?: string;
  // Existing fields
  education: string;
  occupationType: "Job" | "Business" | "Unoccupied";
  occupationLocation: string;
  gender: "Male";
  maritalStatus: "Single" | "Married" | "Widowed" | "Divorced";
  status?: "PENDING" | "ACCEPTED" | "REJECTED";
  // Spouse (split names)
  spouse?: {
    firstName: string;
    middleName: string;
    lastName: string;
    dateOfBirth?: string;
    personId?: string;
    // Father info
    fatherFirstName: string;
    fatherMiddleName: string;
    fatherLastName: string;
    // Mother info
    motherFirstName: string;
    motherMiddleName: string;
    motherLastName: string;
    isDeceased?: boolean;
    education: string;
    occupationType: "Job" | "Business" | "Unoccupied" | "House Wife";
    occupationLocation: string;
    gender: "Female";
  };
  // Children (split names)
  children: Array<{
    firstName: string;
    middleName: string;
    lastName: string;
    dateOfBirth?: string;
    personId?: string;
    gender: "Male" | "Female" | "Other";
    education: string;
  }>;
}
