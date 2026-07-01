const http = require('http');
const req = http.request('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        const body = JSON.parse(data);
        console.log("Login:", body.success);
        const token = body.data.access_token;
        const orgId = body.data.user.organizations[0].organization_id;
        
        http.request('http://localhost:8080/api/whatsapp/devices', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Organization-ID': orgId
            }
        }, (res2) => {
            let data2 = '';
            res2.on('data', d => data2 += d);
            res2.on('end', () => {
                console.log("Devices:", data2);
            });
        }).end();
    });
});
req.write(JSON.stringify({ email: 'admin@sc-pos.com', password: 'password123' }));
req.end();
