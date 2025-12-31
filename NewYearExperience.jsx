import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ominousMessages, hopefulMessages } from './define';


export default function NewYearExperience() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const diceGroupRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const movementRef = useRef({ forward: false, position: 0 });
  const [gameState, setGameState] = useState('exploring');
  const [diceResult, setDiceResult] = useState(null);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.FogExp2(0x1a1a1a, 0.12);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.6, -10);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadow;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Path (ground)
    const pathGeometry = new THREE.PlaneGeometry(5, 50);
    const pathMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.1
    });
    const path = new THREE.Mesh(pathGeometry, pathMaterial);
    path.rotation.x = -Math.PI / 2;
    path.position.y = 0;
    path.position.z = 10;
    path.receiveShadow = true;
    scene.add(path);

    // Fog removed for better visibility

    // Create dice closer and more visible
    const diceGroup = createDice(scene);
    diceGroupRef.current = diceGroup;

    // Dice spotlight
    const diceLight = new THREE.PointLight(0x6644ff, 3, 8);
    diceLight.position.set(0, 2, -3);
    scene.add(diceLight);

    const diceSpot = new THREE.SpotLight(0x8866ff, 2, 10, Math.PI / 6);
    diceSpot.position.set(0, 5, -3);
    diceSpot.target.position.set(0, 0, -3);
    scene.add(diceSpot);
    scene.add(diceSpot.target);

    // Pulsing glow
    let glowIntensity = 3;
    let glowDirection = 0.03;

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      // Dice idle rotation
      if (gameState === 'exploring' && diceGroup) {
        diceGroup.children.forEach((die, i) => {
          die.rotation.y += 0.008;
          die.rotation.x = Math.sin(Date.now() * 0.001 + i) * 0.1;
        });

        // Pulse glow
        glowIntensity += glowDirection;
        if (glowIntensity > 4 || glowIntensity < 2) {
          glowDirection *= -1;
        }
        diceLight.intensity = glowIntensity;
      }

      // Move camera FORWARD (positive Z direction)
      if (movementRef.current.forward && camera.position.z < 3) {
  camera.position.z += 0.025;
}

      renderer.render(scene, camera);
    }
    animate();

    // Start forward movement
    setTimeout(() => {
      movementRef.current.forward = true;
    }, 500);

    // Mouse click handler
    function onMouseClick(event) {
      if (gameState !== 'exploring') return;

      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(diceGroup.children, true);

      if (intersects.length > 0) {
        rollDice();
      }
    }

    window.addEventListener('click', onMouseClick);

    // Handle resize
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onWindowResize);

    return () => {
      window.removeEventListener('click', onMouseClick);
      window.removeEventListener('resize', onWindowResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  function createDice(scene) {
    const diceGroup = new THREE.Group();
    
    // Create two dice - positioned closer to camera for immediate visibility
    const die1 = createSingleDie();
    die1.position.set(-0.8, 0.6, -3);
    diceGroup.add(die1);
    
    const die2 = createSingleDie();
    die2.position.set(0.8, 0.6, -3);
    diceGroup.add(die2);
    
    scene.add(diceGroup);
    return diceGroup;
  }

  function createSingleDie() {
    const dieGroup = new THREE.Group();
    
    // Main cube
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      metalness: 0.2,
      roughness: 0.3
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    dieGroup.add(cube);

    // Add dots on each face
    const dotGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const dotMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x000000,
      metalness: 0.5,
      roughness: 0.5
    });

    // Face configurations: [face, dots_positions]
    const faceConfigs = [
      // Face 1 (front, z+): 1 dot center
      { face: [0, 0, 0.41], dots: [[0, 0, 0]] },
      // Face 2 (back, z-): 2 dots diagonal
      { face: [0, 0, -0.41], dots: [[-0.2, 0.2, 0], [0.2, -0.2, 0]] },
      // Face 3 (top, y+): 3 dots diagonal
      { face: [0, 0.41, 0], dots: [[-0.2, 0, 0.2], [0, 0, 0], [0.2, 0, -0.2]], rotation: [Math.PI/2, 0, 0] },
      // Face 4 (bottom, y-): 4 dots corners
      { face: [0, -0.41, 0], dots: [[-0.2, 0, 0.2], [0.2, 0, 0.2], [-0.2, 0, -0.2], [0.2, 0, -0.2]], rotation: [-Math.PI/2, 0, 0] },
      // Face 5 (right, x+): 5 dots (4 corners + center)
      { face: [0.41, 0, 0], dots: [[-0.2, 0.2, 0], [0.2, 0.2, 0], [-0.2, -0.2, 0], [0.2, -0.2, 0], [0, 0, 0]], rotation: [0, Math.PI/2, 0] },
      // Face 6 (left, x-): 6 dots (2 columns of 3)
      { face: [-0.41, 0, 0], dots: [[-0.2, 0.25, 0], [-0.2, 0, 0], [-0.2, -0.25, 0], [0.2, 0.25, 0], [0.2, 0, 0], [0.2, -0.25, 0]], rotation: [0, -Math.PI/2, 0] },
    ];

    faceConfigs.forEach(config => {
      config.dots.forEach(dotPos => {
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.position.set(...config.face);
        
        // Apply rotation if specified
        if (config.rotation) {
          const tempGroup = new THREE.Group();
          tempGroup.position.set(...dotPos);
          tempGroup.rotation.set(...config.rotation);
          dot.position.add(tempGroup.position);
        } else {
          dot.position.x += dotPos[0];
          dot.position.y += dotPos[1];
          dot.position.z += dotPos[2];
        }
        
        dieGroup.add(dot);
      });
    });

    return dieGroup;
  }

  function rollDice() {
    setGameState('rolling');

    const diceGroup = diceGroupRef.current;
    const dice1 = diceGroup.children[0];
    const dice2 = diceGroup.children[1];
    
    let rotations = 0;
    const maxRotations = 60;
    
    const rollInterval = setInterval(() => {
      dice1.rotation.x += 0.35;
      dice1.rotation.y += 0.25;
      dice1.rotation.z += 0.15;
      
      dice2.rotation.x += 0.25;
      dice2.rotation.y += 0.35;
      dice2.rotation.z += 0.2;
      
      rotations++;
      
      if (rotations >= maxRotations) {
        clearInterval(rollInterval);
        
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const total = die1 + die2;
        
        setDiceResult(total);
        setGameState('result');
        
        setTimeout(() => {
          setShowCard(true);
        }, 500);
      }
    }, 20);
  }

  function resetExperience() {
    setGameState('exploring');
    setDiceResult(null);
    setShowCard(false);
    movementRef.current.position = 0;
    if (cameraRef.current) {
      cameraRef.current.position.z = -10;
    }
  }

  const isOdd = diceResult && [3, 5, 7, 9, 11].includes(diceResult);
  const isEven = diceResult && [2, 4, 6, 8, 10, 12].includes(diceResult);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div ref={containerRef} className="w-full h-full" />
      
      {gameState === 'exploring' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="text-white text-2xl font-light opacity-70 animate-pulse">
            Click the dice to reveal your fate...
          </div>
        </div>
      )}

      {showCard && isOdd && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 animate-fadeIn">
          <div className="relative bg-gradient-to-br from-red-950 to-black border-4 border-red-900 rounded-lg p-12 max-w-2xl shadow-2xl animate-scaleIn">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
            
            <div className="relative z-10 text-center">
              <div className="text-6xl font-bold mb-6 text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]" style={{ fontFamily: 'Georgia, serif', textShadow: '3px 3px 6px rgba(0,0,0,0.8)' }}>
                HAPPY NEW YEAR
              </div>
              
              <div className="text-red-400 text-xl mb-8 font-light">
                Dice Roll: {diceResult} - {ominousMessages[diceResult]?.subtitle}
              </div>
              
              <div className="text-gray-400 text-lg italic mb-8">
                "{ominousMessages[diceResult]?.quote}"
              </div>
              
              <button 
                onClick={resetExperience}
                className="bg-red-900 hover:bg-red-800 text-white px-8 py-3 rounded border border-red-700 transition-all duration-300 hover:shadow-[0_0_20px_rgba(220,38,38,0.5)]"
              >
                Roll Again
              </button>
            </div>
          </div>
        </div>
      )}

      {showCard && isEven && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100 animate-fadeIn">
          <div className="relative bg-white border-4 border-pink-300 rounded-2xl p-12 max-w-2xl shadow-2xl animate-scaleIn overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `-${Math.random() * 20}%`,
                    backgroundColor: ['#ff69b4', '#ffc0cb', '#dda0dd', '#da70d6', '#ee82ee'][Math.floor(Math.random() * 5)],
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
            
            <div className="relative z-10 text-center">
              <div className="text-6xl font-bold mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                HAPPY NEW YEAR
              </div>
              
              <div className="text-pink-600 text-xl mb-8 font-semibold">
                Dice Roll: {diceResult} - {hopefulMessages[diceResult]?.subtitle}
              </div>
              
              <div className="text-gray-700 text-lg italic mb-8">
                "{hopefulMessages[diceResult]?.quote}"
              </div>
              
              <div className="flex justify-center gap-4 mb-8">
                <span className="text-4xl animate-bounce">🎉</span>
                <span className="text-4xl animate-bounce" style={{ animationDelay: '0.1s' }}>🎊</span>
                <span className="text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
                <span className="text-4xl animate-bounce" style={{ animationDelay: '0.3s' }}>🌟</span>
              </div>
              
              <button 
                onClick={resetExperience}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Roll Again
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.8);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.5s ease-out;
        }
        
        .animate-confetti {
          animation: confetti linear infinite;
        }
      `}</style>
    </div>
  );
}