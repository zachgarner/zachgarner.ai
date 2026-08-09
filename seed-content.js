// Seed Ghost with content from the static site
// Run from inside the Ghost container: node /seed-content.js

const http = require('http');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const API_KEY_ID = '69b4138d97fbf50001edce85';
const API_KEY_SECRET = '7fd16a5c37331a8d88027636e8c9fb9559f9a4b54e4fd3981df99f1eba0787d8';

function makeToken() {
  const key = Buffer.from(API_KEY_SECRET, 'hex');
  return jwt.sign({}, key, {
    keyid: API_KEY_ID,
    algorithm: 'HS256',
    expiresIn: '5m',
    audience: '/admin/'
  });
}

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 2368,
      path: `/ghost/api/admin/${path}`,
      method,
      headers: {
        'Authorization': `Ghost ${makeToken()}`,
        'Content-Type': 'application/json',
      }
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(opts, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try { resolve(JSON.parse(raw)); } catch(e) { resolve(raw); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Delete default "Coming Soon" post
async function deleteDefaults() {
  const posts = await apiCall('GET', 'posts/?limit=all');
  if (posts.posts) {
    for (const p of posts.posts) {
      console.log(`Deleting default post: ${p.title}`);
      await apiCall('DELETE', `posts/${p.id}/`);
    }
  }
}

async function createTag(name, slug, opts = {}) {
  const tag = {
    name,
    slug,
    ...opts
  };
  const res = await apiCall('POST', 'tags/', { tags: [tag] });
  if (res.tags) {
    console.log(`Created tag: ${name} (${res.tags[0].id})`);
    return res.tags[0];
  }
  console.log(`Tag error:`, res.errors ? res.errors[0].message : res);
  // Try to find existing
  const existing = await apiCall('GET', `tags/slug/${slug}/`);
  if (existing.tags) return existing.tags[0];
  return null;
}

async function createPost(post) {
  const res = await apiCall('POST', 'posts/', { posts: [post] });
  if (res.posts) {
    console.log(`Created post: ${res.posts[0].title} -> ${res.posts[0].url}`);
    return res.posts[0];
  }
  console.log(`Post error:`, res.errors ? res.errors[0].message : res);
  return null;
}

async function createPage(page) {
  const res = await apiCall('POST', 'pages/', { pages: [page] });
  if (res.pages) {
    console.log(`Created page: ${res.pages[0].title} -> ${res.pages[0].url}`);
    return res.pages[0];
  }
  console.log(`Page error:`, res.errors ? res.errors[0].message : res);
  return null;
}

async function main() {
  // Delete defaults
  await deleteDefaults();

  // Create tags
  const agentsTag = await createTag('Agents', 'agents');
  const physicalAiTag = await createTag('Physical AI', 'physical-ai');
  const leadershipTag = await createTag('Leadership', 'leadership');
  // Internal tag for briefs (starts with #)
  const briefTag = await createTag('#brief', 'hash-brief', { visibility: 'internal' });

  // === ARTICLES ===

  // Article 1: The Agent Infrastructure Nobody Talks About
  await createPost({
    title: 'The Agent Infrastructure Nobody Talks About',
    slug: 'agent-infrastructure',
    custom_excerpt: 'Most agent frameworks focus on orchestration. The hard problems are elsewhere - state management, recovery, and knowing when to stop.',
    html: `<p>Every agent framework wants to sell you on the DAG. Define your nodes, wire up your edges, let the LLM decide which path to take. It's a clean abstraction and a beautiful demo. It's also maybe 10% of what makes an agent work in production.</p>
<p>The other 90% is the stuff nobody puts in their README.</p>
<h2 id="state">State is the whole game</h2>
<p>An agent that runs for thirty seconds doesn't need state management. An agent that runs for thirty minutes - or thirty hours - does. And the moment your agent touches external systems (databases, APIs, file systems), you have a distributed state problem whether you wanted one or not.</p>
<p>The question isn't "what's the agent's current step." It's "if this process dies right now, can I resume without corrupting anything or repeating side effects?" Most frameworks punt on this entirely.</p>
<p>A minimal checkpoint looks something like this:</p>
<pre><code class="language-python">checkpoint = {
    "run_id": run.id,
    "step": current_step,
    "completed_actions": [a.id for a in actions if a.committed],
    "pending_effects": [e.serialize() for e in side_effects],
    "timestamp": time.time()
}
store.save(checkpoint)</code></pre>
<p>Simple, but most agent code doesn't even get this far.</p>
<h2 id="recovery">Recovery isn't retry</h2>
<p>Retry logic is table stakes. Recovery is harder. When an agent fails mid-task, you need to figure out what already happened, what the downstream effects were, and whether the world has changed since the last successful step. This is transactional thinking, not orchestration thinking.</p>
<p>The teams that get this right tend to come from infrastructure backgrounds, not ML backgrounds. They've built job schedulers and workflow engines before. They think in terms of idempotency and checkpoints, not chains and prompts.</p>
<h2 id="stopping">Knowing when to stop</h2>
<p>The hardest problem in agent systems isn't getting them to do things. It's getting them to stop. An agent with access to tools and a vague objective will happily burn tokens forever, exploring every tangent, retrying every failure, elaborating on every response.</p>
<p>Budgets help (token limits, step limits, time limits). But the real solution is tighter scoping. The best agent systems I've seen do less per invocation and compose at a higher level. Small, focused agents that finish fast and hand off cleanly beat one mega-agent that tries to do everything.</p>
<h2 id="boring">The boring parts matter most</h2>
<p>Logging. Observability. Cost tracking. Audit trails. None of this is exciting. All of it is mandatory if you're running agents in production with real users and real money. If you can't answer "what did the agent do, why, and how much did it cost" for every run, you're not ready to ship.</p>`,
    status: 'published',
    tags: [{ slug: 'agents' }],
    published_at: '2026-03-10T12:00:00.000Z'
  });

  // Article 2: How the Physical AI Stack Evolved
  await createPost({
    title: 'How the Physical AI Stack Evolved',
    slug: 'physical-ai-stack-evolution',
    custom_excerpt: 'From specialized perception models to unified VLAs like PI-0.5 - each transition moved where the hard engineering problems live.',
    html: `<p>The physical AI stack has gone through three distinct eras in a relatively short period. If you're working in robotics, autonomous vehicles, or any domain where models need to interact with the physical world, the arc matters. Not as history for its own sake, but because each transition redefined what engineering teams build themselves vs. what they inherit - and the latest shift is changing the infrastructure requirements in ways most teams aren't prepared for.</p>
<h2>The perception era: many models, many pipelines</h2>
<p>In the first era, the stack was a collection of specialized perception models. Object detection, semantic segmentation, depth estimation, lane detection - each had its own model, its own training pipeline, its own data requirements. The planning layer was hand-coded, consuming structured outputs from the perception stack and making decisions through rules and state machines.</p>
<p>The engineering effort lived in the perception layer. Each model needed its own dataset, its own evaluation metrics, its own deployment pipeline. A team might maintain a dozen models simultaneously, each with different training cadences and failure modes. Integration testing was the nightmare - you could improve one model's accuracy and break the system because downstream logic depended on the old behavior.</p>
<h3>Where the work lived</h3>
<p>Model teams owned individual components. System integration was a separate discipline, often undervalued. Data teams were fragmented across model boundaries. Planning was "someone else's problem" - usually a smaller team maintaining increasingly complex rule systems.</p>
<h2>The multimodal transition: fewer models, harder integration</h2>
<p>The second era arrived when vision-language models proved that a single model could handle multiple perception tasks. Instead of a dozen specialized models, teams could use one or two foundation models for most perception needs. The model itself became less of the engineering challenge - you fine-tuned a pre-trained VLM rather than training from scratch.</p>
<p>But the hard problem shifted. The gap between "model produces good outputs" and "robot does the right thing" was enormous. Connecting a VLM's semantic understanding to actual motor control required careful system design. Latency budgets tightened. The planning layer got more complex as it tried to leverage richer model outputs.</p>
<h3>Where the work lived</h3>
<p>System integration became the primary engineering challenge. Model teams shrank or merged. The new bottleneck was the interface between understanding and action - translating model outputs into plans, and plans into motor commands, with hard real-time constraints.</p>
<h2>The VLA era: end-to-end, new bottlenecks</h2>
<p>Vision-Language-Action models like RT-2, Octo, and PI-0.5 collapse the entire stack. One model goes from raw observation (camera frames, proprioception) to motor actions. No separate perception layer. No hand-coded planner. The model is the system.</p>
<p>This sounds like it should make everything simpler. In some ways it does - fewer integration boundaries, fewer failure modes to debug across components. But it creates new problems that most teams aren't set up to handle.</p>
<h3>The data problem explodes</h3>
<p>VLA training data is heterogeneous in ways that LLM text data isn't. Video frames, sensor readings, action labels, language instructions - all need to be aligned, preprocessed, and served to the GPU. This is CPU-heavy work, and it doesn't scale linearly with GPU count. Add more GPUs and you make the data pipeline bottleneck worse, not better.</p>
<h3>Where the work lives now</h3>
<p>Training infrastructure. Data pipeline engineering. The model architecture is increasingly commodity - the competitive advantage is in the training data and how fast you can iterate. Teams that haven't invested in training infrastructure are discovering it's now their primary bottleneck.</p>`,
    status: 'published',
    tags: [{ slug: 'physical-ai' }],
    published_at: '2026-03-08T12:00:00.000Z'
  });

  // === BRIEFS ===

  // Brief 1: The SaaS Collapse Hits Developer Tools First
  await createPost({
    title: 'The SaaS Collapse Hits Developer Tools First',
    slug: 'saas-collapse-developer-tools',
    custom_excerpt: "AI agents don't evaluate your product - they decide whether to replace it.",
    html: `<h2>Engineering time is now nearly free</h2>
<p>SaaS value prop was "we save you engineering time." Agents made engineering time nearly free.</p>
<ul>
<li>3-5 person team + AI coding agent can reimplement a major compute platform in ~6 months</li>
<li>Cost of "build it yourself" collapsed</li>
<li>Value prop evaporates</li>
</ul>
<h2>The agent is both advisor and alternative</h2>
<p>Engineer asks agent "should I use X?" - agent evaluates the product AND can build the replacement.</p>
<ul>
<li>Same dynamic as consultants - they evaluate tools, or suggest building it for you</li>
<li>But consultants have natural brakes: cost, time, risk</li>
<li>Agents removed all the brakes - builds it now, for free, iterates until it works</li>
<li>Adoption cost (API, auth, billing, constraints) vs. implementation cost (near zero)</li>
<li>Implementation wins every time</li>
</ul>
<h2>Developer tools are in the blast radius first</h2>
<p>Not uniform across SaaS. Developer tools are in the blast radius first because three things compound:</p>
<ul>
<li>Developers adopted agents first, trust them on code decisions more than any other role</li>
<li>The products being evaluated are themselves code</li>
<li>Agent is assessing software against its own ability to produce software - tightest possible feedback loop</li>
</ul>
<p>Developers fear AI replacing them. Dev tool companies are one level up the same food chain.</p>
<h2>Abstraction layers are most exposed</h2>
<ul>
<li><strong>Exposed:</strong> pure software abstraction layers - "we saved you from building this"</li>
<li><strong>Durable:</strong> network effects (Stripe), proprietary data (Bloomberg), physical infrastructure (Twilio)</li>
<li><strong>Asymmetry:</strong> open-source frameworks get more durable while commercial wrappers die - agent uses the framework directly, doesn't need the managed platform</li>
</ul>
<h2>The buyer changed</h2>
<p>Companies that see this are reorienting around agents as the primary user:</p>
<ul>
<li>Docs &rarr; API contracts</li>
<li>UI &rarr; tool schemas</li>
<li>Marketing &rarr; benchmarks</li>
<li>Human DX investment &rarr; stranded cost</li>
</ul>
<h2>"We saved you from building this" is dead</h2>
<p>"We already exist" - agents have no switching costs. "We're more reliable" - agents iterate. Need something agents genuinely can't replicate.</p>`,
    status: 'published',
    tags: [{ slug: 'agents' }, { slug: 'hash-brief' }],
    published_at: '2026-03-13T12:00:00.000Z'
  });

  // Brief 2: The Agent Infrastructure Gap
  await createPost({
    title: 'The Agent Infrastructure Gap',
    slug: 'agent-infrastructure-gap',
    custom_excerpt: "Agent frameworks solve orchestration. Nobody's solving state, recovery, or cost control.",
    html: `<h2>Orchestration is 10% of the problem</h2>
<p>Every agent framework sells you on the DAG - define nodes, wire edges, let the LLM decide. Clean abstraction, great demo. Maybe 10% of production agent work.</p>
<ul>
<li>The other 90%: state management, failure recovery, cost tracking, observability</li>
<li>None of it is in the README</li>
</ul>
<h2>State management is the real work</h2>
<p>30-second agent doesn't need state management. 30-minute agent does.</p>
<ul>
<li>Moment your agent touches external systems, you have a distributed state problem</li>
<li>The question isn't "what step is it on" - it's "if this dies now, can I resume without corruption or repeated side effects?"</li>
<li>Most frameworks punt entirely</li>
</ul>
<h2>Recovery requires transactional thinking</h2>
<ul>
<li>Retry logic is table stakes</li>
<li>Recovery means: what already happened, what were the downstream effects, has the world changed since the last checkpoint?</li>
<li>This is transactional thinking, not orchestration thinking</li>
<li>Teams that get this right come from infrastructure backgrounds, not ML</li>
</ul>
<h2>Agents don't know when to stop</h2>
<ul>
<li>Agent with tools and a vague objective will burn tokens forever</li>
<li>Budgets help (token limits, step limits, time limits) but aren't the real solution</li>
<li>Real solution: tighter scoping - small focused agents that finish fast and hand off cleanly</li>
<li>Composition over complexity</li>
</ul>
<h2>The boring parts are mandatory</h2>
<p>Logging, observability, cost tracking, audit trails. Not exciting. All mandatory.</p>
<ul>
<li>If you can't answer "what did the agent do, why, and how much did it cost?" for every run, you're not production-ready</li>
</ul>`,
    status: 'published',
    tags: [{ slug: 'agents' }, { slug: 'hash-brief' }],
    published_at: '2026-03-13T11:00:00.000Z'
  });

  // Brief 3: The VLA Data Bottleneck
  await createPost({
    title: 'The VLA Data Bottleneck',
    slug: 'vla-data-bottleneck',
    custom_excerpt: 'VLA fine-tuning breaks vertical scaling. The bottleneck is data loading, not compute.',
    html: `<h2>VLA data is heterogeneous and CPU-heavy</h2>
<p>VLA training data is heterogeneous - video frames, sensor readings, action labels, language instructions. Not simple text tokens.</p>
<ul>
<li>Each sample requires heavy preprocessing: decode video, align modalities, normalize formats</li>
<li>This is CPU-bound work that happens before the GPU sees anything</li>
<li>More GPUs = more demand on the same data pipeline = bottleneck gets worse, not better</li>
</ul>
<h2>More GPUs makes the bottleneck worse</h2>
<p>Standard approach: bigger node, more GPUs per node.</p>
<ul>
<li>GPU utilization drops as you add GPUs - they're waiting on data</li>
<li>8-GPU node might see 40-50% utilization because CPUs can't feed them fast enough</li>
<li>Throwing money at bigger machines makes the problem more expensive, not smaller</li>
</ul>
<h2>Decouple CPU and GPU scaling</h2>
<p>Decouple CPU and GPU scaling. Scale them independently.</p>
<ul>
<li>Distributed data loading: dedicated CPU workers that preprocess and stream to GPU nodes</li>
<li>Scale CPU workers based on data complexity, GPU workers based on model size</li>
<li>Data pipeline becomes its own service, not a sidecar on the training node</li>
<li>GPU utilization goes back up because the bottleneck moves to where you can address it</li>
</ul>
<h2>Training infra is now a competitive advantage</h2>
<ul>
<li>Any team fine-tuning VLAs on proprietary data (robotics, autonomous vehicles, embodied AI)</li>
<li>The foundation model is increasingly commodity - competitive advantage is in the fine-tuning data and how fast you can iterate on it</li>
<li>Training infrastructure becomes a hiring priority for teams that haven't thought about it</li>
</ul>`,
    status: 'published',
    tags: [{ slug: 'physical-ai' }, { slug: 'hash-brief' }],
    published_at: '2026-03-13T10:00:00.000Z'
  });

  // === ABOUT PAGE ===
  await createPage({
    title: 'About',
    slug: 'about',
    html: `<h2>Background</h2>
<p>I've spent twenty years building AI systems - from early computer vision and machine learning through the current wave of large language models and autonomous agents. My work has spanned research, production infrastructure, and technical leadership, always at the intersection of what's possible and what actually ships.</p>
<h2>Experience</h2>
<p>I'm currently at Anyscale, the company behind Ray, working as a forward deployed engineer and solution architect - helping customers design and implement high scale production AI infrastructure. Before that I held principal engineer and senior management roles building ML platforms, computer vision pipelines, and petabyte-scale AI systems.</p>
<p>I've built systems that serve millions of users, led cross-functional engineering teams, and helped companies figure out where AI actually creates value versus where it's theater - including robotics and autonomy initiatives at BP Energy and Caterpillar.</p>
<h2>Current Work</h2>
<p>I <a href="https://cognizantcoaching.com">coach</a> and consult on AI engineering, architecture, and strategy - agent systems, LLM infrastructure, robotics, and scaling production AI.</p>
<p>Get in touch through <a href="https://linkedin.com/in/zachgarner">LinkedIn</a> or <a href="mailto:hello@zachgarner.ai">email</a> (hello@zachgarner.ai).</p>`,
    status: 'published'
  });

  // Update site settings
  const settings = await apiCall('PUT', 'settings/', {
    settings: [
      { key: 'description', value: 'AI engineering, infrastructure, and technical leadership. Two decades spanning machine learning, computer vision, agents, and production systems.' },
      { key: 'cover_image', value: '' },
      { key: 'accent_color', value: '#0e7a8f' }
    ]
  });
  console.log('Updated site settings');

  console.log('\nDone! Visit http://localhost:2368 to see the site.');
}

main().catch(e => { console.error(e); process.exit(1); });
