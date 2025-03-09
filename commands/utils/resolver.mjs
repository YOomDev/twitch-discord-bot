//////////////
// Resolver //
//////////////

import { sleep } from "./utils.mjs";

let lastRequestId = -1;
const requests = [];

export function createRequest() {
    lastRequestId += 1;
    const id = lastRequestId;
    requests.push({ id: id, resolved: false, data: 0 });
    return id;
}

export async function getSolvedRequest(id){
    for (let i = 0; i < requests.length; i++) {
        if (requests[i].id !== id) { continue; }
        while (true) {
            await sleep(0.5);
            if (requests[i].resolved) {
                const returnData = requests[i].data;
                requests.splice(i, 1);
                return returnData;
            }
        }
    }
    return 0;
}

export function resolveRequest(id, data) {
    for (let i = 0; i < requests.length; i++) {
        if (requests[i].id === id) {
            requests[i].data = data;
            requests[i].resolved = true;
            return;
        }
    }
}

export default {}