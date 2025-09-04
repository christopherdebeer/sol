const data = {
  text: 'Sun',
  children: [
    { text: 'Idea 1', children: [] },
    { text: 'Idea 2', children: [] },
    { text: 'Idea 3', children: [] },
  ],
};

let currentNode = data;

function render() {
  const container = document.getElementById('mindmap');
  container.innerHTML = '';

  const center = createBubble(currentNode, true);
  container.appendChild(center);

  const radius = 150;
  const count = currentNode.children.length;
  currentNode.children.forEach((child, i) => {
    const angle = (2 * Math.PI * i) / count;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    const bubble = createBubble(child, false);
    bubble.style.transform = `translate(${x}px, ${y}px)`;
    container.appendChild(bubble);
  });
}

function createBubble(node, isCenter) {
  const div = document.createElement('div');
  div.className = 'bubble' + (isCenter ? ' center' : '');
  div.textContent = node.text;

  div.addEventListener('click', () => {
    if (node !== currentNode) {
      currentNode = node;
      render();
    }
  });

  div.addEventListener('dblclick', () => {
    div.contentEditable = true;
    div.focus();
  });

  div.addEventListener('blur', () => {
    div.contentEditable = false;
    node.text = div.textContent;
  });

  let pressTimer;
  div.addEventListener('mousedown', (e) => {
    e.preventDefault();
    pressTimer = setTimeout(() => showMenu(node, div), 600);
  });
  ['mouseup', 'mouseout'].forEach((ev) =>
    div.addEventListener(ev, () => clearTimeout(pressTimer))
  );

  return div;
}

function showMenu(node, element) {
  const menu = document.createElement('div');
  menu.className = 'menu';

  const add = document.createElement('button');
  add.textContent = 'Add';
  add.onclick = () => {
    node.children.push({ text: 'New', children: [] });
    render();
  };
  menu.appendChild(add);

  if (node !== data) {
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.onclick = () => {
      removeNode(data, node);
      currentNode = data;
      render();
    };
    menu.appendChild(del);
  }

  document.body.appendChild(menu);
  const rect = element.getBoundingClientRect();
  menu.style.left = rect.left + 'px';
  menu.style.top = rect.top - 40 + 'px';

  const dismiss = () => {
    menu.remove();
    document.body.removeEventListener('click', dismiss);
  };
  setTimeout(() => document.body.addEventListener('click', dismiss), 0);
}

function removeNode(parent, target) {
  parent.children = parent.children.filter((ch) => ch !== target);
  parent.children.forEach((ch) => removeNode(ch, target));
}

render();
