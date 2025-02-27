export async function sleep(seconds) { return new Promise(resolve => setTimeout(resolve, Math.max(seconds, 0) * 1000)); }

export function concat(list, separator = "", prefix = "", start = 0, count = list.length) {
    const end = Math.min(start + count, list.length);
    let result = "";
    for (let i = start; i < end; i++) { result += (i <= start ? "" : separator) + prefix + list[i]; }
    return result;
}

export default {}