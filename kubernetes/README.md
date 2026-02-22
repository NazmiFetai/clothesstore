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

# Clothesstore Kubernetes Deployment (Dev / Staging / Prod)

This repo deploys a multi-component web application on Kubernetes in three isolated environments using namespaces and Kustomize overlays.

## Components

- **web**: Deployment (frontend/API)
- **postgres**: StatefulSet + PVC for persistent storage
- **services**: ClusterIP services for web and postgres
- **config**: ConfigMaps + Secrets
- **autoscaling**:
  - HPA (staging + prod)
  - VPA (recommendation-only mode)

---

## Prerequisites (teacher machine)

- Kubernetes cluster (Minikube is fine)
- `kubectl` (with Kustomize support: `kubectl apply -k ...`)
- Metrics Server installed (required for HPA)
- Internet access to pull images from Docker Hub

## Docker Images

Web image is hosted publicly on Docker Hub:

- `nf30090/clothesstore:dev`
- `nf30090/clothesstore:staging`
- `nf30090/clothesstore:prod`

Postgres uses official image:

- `postgres:17`

---

## Install VPA CRDs + recommender (required once per cluster)

Apply the VPA CRDs and VPA components:

```bash
kubectl apply -f kubernetes/addons/vpa/vpa-v1-crd-gen.yaml
kubectl apply -f kubernetes/addons/vpa/vpa-rbac.yaml
kubectl apply -f kubernetes/addons/vpa/vpa-recommender-deployment.yaml
```
