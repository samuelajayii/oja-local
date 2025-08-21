# 🛍️ OjaLocal – Neighbourhood Marketplace  

OjaLocal is a **cloud-native neighbourhood marketplace** where users can buy and sell goods locally.  
It is built with **Next.js** and deployed on **Google Kubernetes Engine (GKE)**, leveraging Google Cloud services for authentication, storage, observability, and scalability.  

---

## 🚀 Features
- 🛒 User registration & login (Google Sign-in via Firebase Auth).  
- 📦 Create, browse, and manage marketplace listings.  
- 🖼️ Image uploads to **Cloud Storage**.  
- 💾 Persistent data using **Cloud SQL (Postgres)**.  
- 📊 Centralized logging & monitoring with **Cloud Logging + Cloud Monitoring**.  
- 🔐 Secure deployment with HTTPS, GCP IAM, and secret management.  
- ☁️ Fully cloud-native, running on **GKE with Cloud Load Balancer**.  

---

## 🛠️ Tech Stack
- **Frontend**: [Next.js 14](https://nextjs.org/) (App Router, React Server Components)  
- **Auth**: [Firebase Auth](https://firebase.google.com/products/auth) (Google Sign-in)  
- **Database**: [Cloud SQL – Postgres](https://cloud.google.com/sql)  
- **Storage**: [Cloud Storage](https://cloud.google.com/storage) (user uploads & product images)  
- **Deployment**: [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine)  
- **CI/CD**: [Cloud Build](https://cloud.google.com/build) or GitHub Actions  
- **Monitoring**: [Cloud Logging & Cloud Monitoring](https://cloud.google.com/stackdriver)  
- **Containerization**: Docker  

---