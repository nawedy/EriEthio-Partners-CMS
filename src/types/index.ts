// Core types for the CMS
export interface Tenant {
  id: string;
  name: string;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
  settings: TenantSettings;
  status: 'active' | 'inactive';
}

export interface TenantSettings {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    logo: string;
  };
  features: {
    blog: boolean;
    ecommerce: boolean;
    customDomain: boolean;
  };
}

export interface Page {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  content: PageContent[];
  meta: PageMeta;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export interface PageContent {
  id: string;
  type: 'hero' | 'text' | 'image' | 'services' | 'team' | 'contact';
  data: any;
  style: {
    padding: string;
    margin: string;
    backgroundColor: string;
    [key: string]: any;
  };
}

export interface PageMeta {
  description: string;
  keywords: string[];
  ogImage: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  tenantId: string;
  name: string;
  type: 'image' | 'video' | 'document';
  url: string;
  size: number;
  createdAt: Date;
}
