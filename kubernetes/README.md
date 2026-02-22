# ClothesStore — Kubernetes Deployment (Dev / Staging / Prod)

This repo deploys a multi-component application (**web + PostgreSQL**) into Kubernetes across three isolated environments using namespaces and Kustomize overlays.

## Environments

- Dev: `clothesstore-dev`
- Staging: `clothesstore-staging`
- Prod: `clothesstore-prod`

## Docker Images (public)

Web image on Docker Hub:

- `nf30090/clothesstore:dev`
- `nf30090/clothesstore:staging`
- `nf30090/clothesstore:1.0.0`

Database image:

- `postgres:17`

---

## Prerequisites (teacher machine)

- Kubernetes cluster (Minikube OK)
- `kubectl` installed (supports `kubectl apply -k ...`)
- Metrics Server installed (required for HPA)
  - Minikube: `minikube addons enable metrics-server`
- Internet access to pull images from Docker Hub

> VPA is used in **recommendation-only mode** (no automatic pod updates).

---

## 1) Clone repo

### PowerShell

```powershell
git clone https://github.com/NazmiFetai/clothesstore.git
cd clothesstore
```
