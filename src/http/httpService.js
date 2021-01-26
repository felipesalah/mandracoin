import axios from 'axios';

class HttpService {
    request;

    constructor(baseURL) {
        this.request = axios.create({ baseURL });
    }

    get = route => {
        return this.request.get(route);
    }

    post = (route, data) => {
        return this.request.post(route, data);
    }
}

export default HttpService;