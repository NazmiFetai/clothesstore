# ClothesStore — Teacher Runbook (Kubernetes)

This repository deploys a multi-component web application (**web + PostgreSQL**) into Kubernetes across three isolated environments:

- **Development** namespace: `clothesstore-dev`
- **Staging** namespace: `clothesstore-staging`
- **Production** namespace: `clothesstore-prod`

Deployment is done with **Kustomize overlays**:

- `kubernetes/overlays/dev`
- `kubernetes/overlays/staging`
- `kubernetes/overlays/prod`

---

## 0) How images are delivered (important)

You do **not** need to manually download images.

When you apply the manifests, **Kubernetes pulls images automatically** from Docker Hub based on the `image:` fields in the Deployment/StatefulSet.

Web images (public Docker Hub):

- `nf30090/clothesstore:dev`
- `nf30090/clothesstore:staging`
- `nf30090/clothesstore:1.0.0` (production)

Database image:

- `postgres:17`

---

## 1) Prerequisites

- A Kubernetes cluster (Minikube is OK)
- `kubectl` installed (supports `kubectl apply -k ...`)
- **Metrics Server** installed (required for HPA)
  - Minikube: `minikube addons enable metrics-server`
- Internet access (to pull images from Docker Hub)

Optional (only needed if you want to see VPA recommendations):

- **VPA installed in the cluster** (CRDs + recommender)

---

## 2) Clone repository

```bash
git clone https://github.com/NazmiFetai/clothesstore.git
cd clothesstore
```

---

## 3) Install VPA (optional, one-time per cluster)

> If VPA is not installed, applying the `VerticalPodAutoscaler` objects will fail because the CRD does not exist.

```
kubectl apply -f kubernetes/addons/vpa/vpa-v1-crd-gen.yaml
kubectl apply -f kubernetes/addons/vpa/vpa-rbac.yaml
kubectl apply -f kubernetes/addons/vpa/recommender-deployment.yaml
```

Verify VPA CRDs exist:

```
kubectl get crd | findstr verticalpodautoscaler
---

## 4) Deploy environments

```

kubectl apply -k kubernetes/overlays/dev
kubectl apply -k kubernetes/overlays/staging
kubectl apply -k kubernetes/overlays/prod

```

---

## 5) Verify resources

Dev:

```

kubectl get deploy,sts,svc,cm,secret,quota,limitrange,vpa -n clothesstore-dev
kubectl get pods -n clothesstore-dev

```

Staging:

```

kubectl get deploy,sts,svc,cm,secret,quota,limitrange,hpa,vpa -n clothesstore-staging
kubectl get pods -n clothesstore-staging

```

Production:

```

kubectl get deploy,sts,svc,cm,secret,limitrange,hpa,vpa -n clothesstore-prod
kubectl get pods -n clothesstore-prod

```

---

## 6) Access the web app

Port-forward the **service/web** in any namespace:

```

kubectl port-forward -n clothesstore-dev svc/web 8080:80

```

Open: http://localhost:8080

---

## 7) Autoscaling checks

HPA (staging/prod):

```

kubectl get hpa -n clothesstore-staging
kubectl get hpa -n clothesstore-prod

```

VPA recommendations (all namespaces, if VPA installed):

```

kubectl get vpa -n clothesstore-dev
kubectl describe vpa vpa-web -n clothesstore-dev | findstr /i "Mode Recommendation Cpu Memory Provided"

kubectl get vpa -n clothesstore-staging
kubectl describe vpa vpa-web -n clothesstore-staging | findstr /i "Mode Recommendation Cpu Memory Provided"

kubectl get vpa -n clothesstore-prod
kubectl describe vpa vpa-web -n clothesstore-prod | findstr /i "Mode Recommendation Cpu Memory Provided"

```

---

## 8) Cleanup

```

kubectl delete ns clothesstore-dev clothesstore-staging clothesstore-prod

```

```
