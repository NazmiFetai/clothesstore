# ClothesStore — Kubernetes Deployment Runbook

This repo deploys a multi-component web application (web + PostgreSQL) into Kubernetes across three isolated environments:

- Development: `clothesstore-dev`
- Staging: `clothesstore-staging`
- Production: `clothesstore-prod`

Images are hosted publicly on Docker Hub:

- `nf30090/clothesstore:dev`
- `nf30090/clothesstore:staging`
- `nf30090/clothesstore:1.0.0` (prod)

> Kubernetes manifests are deployed using Kustomize overlays:
>
> - `kubernetes/overlays/dev`
> - `kubernetes/overlays/staging`
> - `kubernetes/overlays/prod`

---

## 1) Prerequisites (teacher machine)

- Kubernetes cluster (Minikube OK)
- `kubectl` installed
- Metrics Server (required for HPA)
  - Minikube: `minikube addons enable metrics-server`
- (If testing VPA) Vertical Pod Autoscaler installed:
  - VPA CRDs + recommender/updater/admission-controller

---

## 2) Clone repo

```powershell
git clone https://github.com/NazmiFetai/clothesstore.git
cd clothesstore
```
