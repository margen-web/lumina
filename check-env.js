const token = process.env.VERCEL_TOKEN;
const teamId = 'team_iSQsNIZfIu65usMbLh67U0v1';
const projectId = 'prj_T7FlaAbYKmht6sUCkTyh3EasSIxb';

async function main() {
    const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?teamId=${teamId}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.envs) {
        json.envs.forEach(env => {
            console.log(`- ${env.key} (Target: ${env.target.join(',')})`);
        });
    } else {
        console.log("Error:", json);
    }
}
main().catch(console.error);
