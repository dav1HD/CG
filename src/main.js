// ----------------- SEÇÃO: Funções base do webgl -------------------------
// ----------------- FONTE: Repositório da disciplina ---------------------
const vertexShaderSource = `
    attribute vec3 a_position;
    attribute vec3 a_normal;
    
    varying vec3 v_normal;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    
    uniform mat4 u_modelMatrix;
    uniform mat4 u_viewingMatrix;
    uniform mat4 u_projectionMatrix;
    uniform mat4 u_inverseTransposeModelMatrix;
    
    uniform vec3 u_lightPosition;
    uniform vec3 u_viewPosition;

    void main() {
        gl_Position = u_projectionMatrix * u_viewingMatrix * u_modelMatrix * vec4(a_position,1.0);
        v_normal = normalize(mat3(u_inverseTransposeModelMatrix) * a_normal);
        vec3 surfacePosition = (u_modelMatrix * vec4(a_position, 1.0)).xyz;
        v_surfaceToLight = u_lightPosition - surfacePosition;
        v_surfaceToView = u_viewPosition - surfacePosition;
    }
`;

// Fragment shader source code
const fragmentShaderSource = `
    precision mediump float;
    
    uniform vec3 u_color;

    varying vec3 v_normal;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;

    void main() {
      vec3 ambientReflection = u_color;
      vec3 diffuseReflection = u_color;
      vec3 specularReflection = vec3(1.0,1.0,1.0);

      vec3 normal = normalize(v_normal);
      vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
      vec3 surfaceToViewDirection = normalize(v_surfaceToView);
      vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

      float light = max(dot(surfaceToLightDirection, normal), 0.0);
      float specular = 0.0;
      if (light > 0.0) {
        specular = pow(max(dot(normal, halfVector), 0.0), 250.0);
      }

      vec3 colorOut = 0.5 * ambientReflection + 0.5 * light * diffuseReflection;
      colorOut += specular * specularReflection;
      gl_FragColor = vec4(colorOut, 1.0);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error linking program:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

function loadOBJFromTag(tagId) {
  const objText = document.getElementById(tagId).textContent;
  return parseOBJ(objText);
}

function parseOBJ(text) {
  const positions = [];
  const normals = [];
  const indices = [];

  const tempVertices = [];
  const tempNormals = [];

  const lines = text.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#') || line === '') continue;

    const parts = line.split(/\s+/);
    const keyword = parts[0];
    const args = parts.slice(1);

    if (keyword === 'v') {
      tempVertices.push(args.map(parseFloat));
    } else if (keyword === 'vn') {
      tempNormals.push(args.map(parseFloat));
    } else if (keyword === 'f') {
      const faceVerts = args.map(f => {
        // Supports v//vn and v/vt/vn
        const parts = f.split('/');
        const v = parseInt(parts[0]) - 1;
        const n = parts.length > 2 && parts[2] ? parseInt(parts[2]) - 1 : undefined;
        return { v, n };
      });

      for (let i = 1; i < faceVerts.length - 1; i++) {
        const tri = [faceVerts[0], faceVerts[i], faceVerts[i + 1]];
        tri.forEach(({ v, n }) => {
          const vert = tempVertices[v];
          const norm = n !== undefined ? tempNormals[n] : [0, 0, 1]; // default normal
          positions.push(...vert);
          normals.push(...norm);
          indices.push(indices.length);
        });
      }
    }
  }

  return { positions, normals, indices };
}

function setCubeVertices(side) {
    let v = side / 2;
    return new Float32Array([
        // frente
        -v, -v,  v,   v, -v,  v,   v,  v,  v,  -v,  v,  v,
        // atras
        -v, -v, -v,  -v,  v, -v,   v,  v, -v,   v, -v, -v,
        // cima
        -v,  v, -v,  -v,  v,  v,   v,  v,  v,   v,  v, -v,
        // baixo
        -v, -v, -v,   v, -v, -v,   v, -v,  v,  -v, -v,  v,
        // direita
            v, -v, -v,   v,  v, -v,   v,  v,  v,   v, -v,  v,
        // esquerda
        -v, -v, -v,  -v, -v,  v,  -v,  v,  v,  -v,  v, -v
    ]);
}

function setCubeNormals() {
    const faceNormals = [
        [0, 0, 1],  // frente
        [0, 0, -1], // atras
        [0, 1, 0],  // cima
        [0, -1, 0], // baixo
        [1, 0, 0],  // direita
        [-1, 0, 0]  // esquerda
    ];
    const normals = [];
    for (let i = 0; i < 6; i++) {
        const n = faceNormals[i];
        for (let j = 0; j < 4; j++) {
            normals.push(...n);
        }
    }
    return new Float32Array(normals);
}

function setCubeColors() {
    // define as cores das faces definidas
    const faceColors = [
        [1.0, 0.0, 0.0], // vermelho
        [0.0, 1.0, 0.0], // verde
        [0.0, 0.0, 1.0], // azul
        [1.0, 1.0, 0.0], // amarelo
        [1.0, 0.0, 1.0], // roxo
        [0.0, 1.0, 1.0]  // ciano
    ];
    let colors = [];
    for (let j = 0; j < 6; j++) {
        const c = faceColors[j];
        // 4 vértices por face
        for (let i = 0; i < 4; i++) {
            colors.push(...c);
        }
    }
    return new Float32Array(colors);
}

function setCubeIndices() {
    return new Uint16Array([
        0,  1,  2,      0,  2,  3,    // frente
        4,  5,  6,      4,  6,  7,    // atras
        8,  9,  10,     8,  10, 11,   // cima
        12, 13, 14,     12, 14, 15,   // baixo
        16, 17, 18,     16, 18, 19,   // direita
        20, 21, 22,     20, 22, 23    // esquerda
    ]);
}

// ----------------- SEÇÃO: Função principal ----------------------------
function main() {
    const canvas = document.getElementById('glCanvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('WebGL nao esta disponivel no seu navegador');
        return;
    }

    function redimensionarCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    redimensionarCanvas();
    window.addEventListener('resize', redimensionarCanvas);

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const normalLocation = gl.getAttribLocation(program, 'a_normal');
    
    const modelMatrixUniformLocation = gl.getUniformLocation(program, 'u_modelMatrix');
    const viewingMatrixUniformLocation = gl.getUniformLocation(program, 'u_viewingMatrix');
    const projectionMatrixUniformLocation = gl.getUniformLocation(program, 'u_projectionMatrix');
    const inverseTransposeModelMatrixUniformLocation = gl.getUniformLocation(program, 'u_inverseTransposeModelMatrix');

    const colorUniformLocation = gl.getUniformLocation(program, 'u_color');
    let color = [1.0, 0.0, 0.0];
    gl.uniform3fv(colorUniformLocation, new Float32Array(color));

    const lightPositionUniformLocation = gl.getUniformLocation(program,'u_lightPosition');
    const viewPositionUniformLocation = gl.getUniformLocation(program,'u_viewPosition');

    gl.uniform3fv(lightPositionUniformLocation,  new Float32Array([5, 5, 5]));

    // buffer do cubo
    const cubeVertexBuffer = gl.createBuffer();
    const vertices = setCubeVertices(1.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const cubeNormalBuffer = gl.createBuffer();
    const cubeNormals = setCubeNormals();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);

    const cubeColorBuffer = gl.createBuffer();
    const colors = setCubeColors();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    const cubeIndexBuffer = gl.createBuffer();
    const indices = setCubeIndices();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // definir as caracteristicas da malha
    const gridSize = 20;
    const gridSpacing = 1;
    const gridVertices = [];
    const gridColorVal = [0.3, 0.3, 0.3];

    // buffer do sportscar
    const objVertexBuffer = gl.createBuffer();
    const objNormalBuffer = gl.createBuffer();
    const objIndexBuffer = gl.createBuffer();

    const objData = loadOBJFromTag("sportcar-model");
    console.log("SPORTCAR OBJ:", objData);

    let objVertices = objData.positions.length ? new Float32Array(objData.positions) : new Float32Array([]);
    let objNormals = objData.normals.length ? new Float32Array(objData.normals) : new Float32Array([]);
    let objIndices = objData.indices.length ? new Uint16Array(objData.indices) : new Uint16Array([]);

    if (objVertices.length > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, objVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, objVertices, gl.STATIC_DRAW);
    }
    if (objNormals.length > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, objNormalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, objNormals, gl.STATIC_DRAW);
    }
    if (objIndices.length > 0) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objIndexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, objIndices, gl.STATIC_DRAW);
    }

    // buffer do segundo objeto (buggy)
    const buggyVertexBuffer = gl.createBuffer();
    const buggyNormalBuffer = gl.createBuffer();
    const buggyIndexBuffer = gl.createBuffer();

    const buggyData = loadOBJFromTag("buggy-model");
    console.log("BUGGY OBJ:", buggyData);

    let buggyVertices = buggyData.positions.length ? new Float32Array(buggyData.positions) : new Float32Array([]);
    let buggyNormals = buggyData.normals.length ? new Float32Array(buggyData.normals) : new Float32Array([]);
    let buggyIndices = buggyData.indices.length ? new Uint32Array(buggyData.indices) : new Uint32Array([]);


    if (buggyVertices.length > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buggyVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, buggyVertices, gl.STATIC_DRAW);
    }
    if (buggyNormals.length > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buggyNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, buggyNormals, gl.STATIC_DRAW);
    }
    if (buggyIndices.length > 0) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buggyIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, buggyIndices, gl.STATIC_DRAW);
    }
    
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];

    for (let i = 0; i < objVertices.length; i += 3) {
        let x = objVertices[i];
        let y = objVertices[i + 1];
        let z = objVertices[i + 2];

        min[0] = Math.min(min[0], x);
        min[1] = Math.min(min[1], y);
        min[2] = Math.min(min[2], z);

        max[0] = Math.max(max[0], x);
        max[1] = Math.max(max[1], y);
        max[2] = Math.max(max[2], z);
    }

    let size = Math.max(
        max[0] - min[0],
        max[1] - min[1],
        max[2] - min[2],
    );

    let scaleToFit = 1.0 / size; 
    let objScale = scaleToFit;

    for (let i = -gridSize; i <= gridSize; i++) {
        gridVertices.push(-gridSize * gridSpacing, -2, i * gridSpacing, ...gridColorVal, gridSize * gridSpacing, -2, i * gridSpacing, ...gridColorVal);
    }
    for (let i = -gridSize; i <= gridSize; i++) {
        gridVertices.push(i * gridSpacing, -2, -gridSize * gridSpacing, ...gridColorVal, i * gridSpacing, -2, gridSize * gridSpacing, ...gridColorVal);
    }
    const gridBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gridVertices), gl.STATIC_DRAW);

    // variaveis de estado que vao ser usadas na camera
    let objPosition = [0, 0, 0];
    let cubePosition = [0, 0, 0];
    let cameraAngleH = 0;
    let cameraAngleV = 0.5;
    let cameraDistance = 10;
    let targetCameraAngleH = 0;
    let targetCameraAngleV = 0.5;
    let defaultCameraAngleH = 0;
    let defaultCameraAngleV = 0.5;

    const keys = {};
    window.addEventListener('keydown', (e) => { keys[e.key] = true; });
    window.addEventListener('keyup', (e) => { keys[e.key] = false; });
    // detecta os eventos de apertar e soltar botoes
    let lastTime = 0;

    function drawCube(modelMatrix){
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuffer);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(normalLocation);

        gl.uniform3fv(colorUniformLocation, color);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
        
        gl.uniformMatrix4fv(modelMatrixUniformLocation, false, modelMatrix);

        const inv = m4.inverse(modelMatrix);
        const invTrans = m4.transpose(inv);
        gl.uniformMatrix4fv(inverseTransposeModelMatrixUniformLocation, false, invTrans);

        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }

    function drawGrid(){
        gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(positionLocation);

        gl.uniform3fv(colorUniformLocation, color);
        
        const gridModelMatrix = m4.identity();
        gl.uniformMatrix4fv(modelMatrixUniformLocation, false, gridModelMatrix);

        const invGrid = m4.inverse(gridModelMatrix);
        const invTransGrid = m4.transpose(invGrid);
        gl.uniformMatrix4fv(inverseTransposeModelMatrixUniformLocation, false, invTransGrid);

        gl.drawArrays(gl.LINES, 0, gridVertices.length / 6);
    }

    function drawOBJ(modelMatrix) {
        if (objVertices.length === 0) return;

        gl.bindBuffer(gl.ARRAY_BUFFER, objVertexBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, objNormalBuffer);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(normalLocation);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objIndexBuffer);
        gl.uniformMatrix4fv(modelMatrixUniformLocation, false, modelMatrix);

        const inv = m4.inverse(modelMatrix);
        const invT = m4.transpose(inv);
        gl.uniformMatrix4fv(inverseTransposeModelMatrixUniformLocation, false, invT);

        gl.uniform3fv(colorUniformLocation, new Float32Array([0, 0.8, 0]));
        gl.drawElements(gl.TRIANGLES, objIndices.length, gl.UNSIGNED_SHORT, 0);

    }

    function drawScene(time) {
        time *= 0.001;
        const deltaTime = time - lastTime;
        lastTime = time;

        // logica da atualizacao de estado, o atributo de velocidade serve para modificar a posicao do objeto no canvas
        const baseSpeed = 0.01; 
        const speed = baseSpeed * objScale * deltaTime;
        if (keys['w'] || keys['W']) objPosition[2] -= speed;
        if (keys['s'] || keys['S']) objPosition[2] += speed;
        if (keys['a'] || keys['A']) objPosition[0] -= speed;
        if (keys['d'] || keys['D']) objPosition[0] += speed;
        if (keys['q'] || keys['Q']) objPosition[1] += speed;
        if (keys['e'] || keys['E']) objPosition[1] -= speed;

        if (keys['ArrowUp']) {
            targetCameraAngleV = Math.PI / 2 - 0.1;
            targetCameraAngleH = defaultCameraAngleH;
        } else if (keys['ArrowLeft']) {
            targetCameraAngleH = defaultCameraAngleH + Math.PI / 2;
            targetCameraAngleV = defaultCameraAngleV;
        } else if (keys['ArrowRight']) {
            targetCameraAngleH = defaultCameraAngleH - Math.PI / 2;
            targetCameraAngleV = defaultCameraAngleV;
        } else {
            targetCameraAngleH = defaultCameraAngleH;
            targetCameraAngleV = defaultCameraAngleV;
        }

        const lerpSpeed = 5 * deltaTime;
        cameraAngleH += (targetCameraAngleH - cameraAngleH) * lerpSpeed;
        cameraAngleV += (targetCameraAngleV - cameraAngleV) * lerpSpeed;

        gl.clearColor(0.05, 0.05, 0.05, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        let modelMatrix = m4.translation(objPosition[0], objPosition[1], objPosition[2]);
        modelMatrix = m4.scale(modelMatrix, objScale, objScale, objScale);

        const cameraX = objPosition[0] + cameraDistance * Math.cos(cameraAngleV) * Math.sin(cameraAngleH);
        const cameraY = objPosition[1] + cameraDistance * Math.sin(cameraAngleV);
        const cameraZ = objPosition[2] + cameraDistance * Math.cos(cameraAngleV) * Math.cos(cameraAngleH);
        
        const P0 = [cameraX, cameraY, cameraZ];
        const Pref = objPosition;
        const V = [0, 1, 0];
        const viewingMatrix = m4.setViewingMatrix(P0, Pref, V);

        // projecao 3d
        const aspect = canvas.width / canvas.height;
        const zNear = 0.1;
        const zFar = 100.0;
        const fovY = Math.PI / 4;
        
        const top = zNear * Math.tan(fovY / 2);
        const height = 2 * top;
        const width = aspect * height;
        const xw_max = width / 2;
        const xw_min = -width / 2;
        const yw_max = top;
        const yw_min = -top;

        const projectionMatrix = m4.setPerspectiveProjectionMatrix(xw_min, xw_max, yw_min, yw_max, -zNear, -zFar);

        gl.uniformMatrix4fv(viewingMatrixUniformLocation, false, viewingMatrix);
        gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);

        gl.uniform3fv(viewPositionUniformLocation, new Float32Array(P0));

        drawGrid();
        drawOBJ(modelMatrix);

        requestAnimationFrame(drawScene);
    }

    requestAnimationFrame(drawScene);
}

function crossProduct(v1, v2) {
  let result = [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0]
  ];
  return result;
}

function unitVector(v){ 
    let vModulus = vectorModulus(v);
    return v.map(function(x) { return x/vModulus; });
}

function vectorModulus(v){
    return Math.sqrt(Math.pow(v[0],2)+Math.pow(v[1],2)+Math.pow(v[2],2));
}

function radToDeg(r) {
  return r * 180 / Math.PI;
}

function degToRad(d) {
  return d * Math.PI / 180;
}

// ----------------- SEÇÃO: Inicialização do programa ---------------------
window.addEventListener('load', main);
