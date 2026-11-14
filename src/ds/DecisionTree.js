// Decision tree: our central data structure for the rubric (non-linear).
// Each inner node asks one question; each answer picks a child; leaves hold the result.
// Used for: the body scan assessment.
// traverse O(h) where h = height · build O(n) · space O(n)

export class TreeNode {
  constructor({ id, question = null, leaf = null }) {
    this.id = id;
    this.question = question; // { id, text } for inner nodes
    this.children = new Map(); // answer -> TreeNode
    this.leaf = leaf; // { color, title, cause, action, source } for leaves
  }

  isLeaf() { return this.leaf !== null; }
}

export class DecisionTree {
  constructor(root) {
    this.root = root;
  }

  // Add a child under a parent for one answer. O(1)
  static connect(parent, answer, child) {
    parent.children.set(answer, child);
    return child;
  }

  // Walk from the root using the answers. Returns the leaf and the path taken.
  // If an answer is missing or unknown, stop and return the fallback leaf.
  traverse(answers, fallbackLeaf = DecisionTree.UNKNOWN) {
    const path = [];
    let node = this.root;
    while (node && !node.isLeaf()) {
      const answer = answers[node.question.id];
      path.push(`${node.question.text} → ${answer ?? '(no answer)'}`);
      const next = node.children.get(answer);
      if (!next) return { leaf: fallbackLeaf, path, complete: false };
      node = next;
    }
    return { leaf: node.leaf, path, complete: true };
  }

  // Height of the tree, used in the Big O explanation. O(n)
  height(node = this.root) {
    if (!node || node.isLeaf()) return 0;
    let max = 0;
    for (const child of node.children.values()) max = Math.max(max, this.height(child));
    return 1 + max;
  }

  // Build a tree from the JSON format in symptoms.json (see README). O(n)
  static fromJSON(json) {
    const build = (n) => {
      if (n.leaf) return new TreeNode({ id: n.id, leaf: n.leaf });
      const node = new TreeNode({ id: n.id, question: n.question });
      for (const [answer, child] of Object.entries(n.answers)) {
        DecisionTree.connect(node, answer, build(child));
      }
      return node;
    };
    return new DecisionTree(build(json));
  }
}

// What the app says when the tree has no answer for a case.
DecisionTree.UNKNOWN = {
  color: 'yellow',
  title: 'Not covered by our tree',
  cause: 'This combination is not in our NASA-based data yet.',
  action: 'Tell the crew and send a report to the flight surgeons if it continues.',
  source: 'https://www.nasa.gov/hrp/risks/',
};
