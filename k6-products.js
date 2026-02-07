import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 5,          // 5 virtual users
  duration: '10s', // 10 seconds
};

export default function () {
  const res = http.get('http://host.docker.internal:3000/api/v1/products?limit=10&offset=0');

  if (res.status !== 200) {
    console.error('Non-200 status:', res.status);
  }

  sleep(1);
}
