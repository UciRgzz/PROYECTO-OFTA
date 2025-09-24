//=========== GESTION DE INDEX============================//
// Asegurar que las funciones globales estén definidas
window.mostrarSeccion = function(seccion){
  const paginas = {
    expedientes: "/frontend/expedientes.html",
    recibos: "/frontend/recibo.html",
    cierredecaja: "/frontend/cierre-caja.html",
    medico: "/frontend/medico.html",
    ordenes: "/frontend/ordenes.html",
    optometria: "/frontend/optometria.html",
    insumos: "/frontend/insumos.html",
    usuarios: "/frontend/admin/usuarios.html",
    agendaquirurgica: "/frontend/A_Quirurgica.html",
    asignarmodulos: "/frontend/A_modulos.html"
  };
  
  const main = document.getElementById('main-content');
  const header = document.getElementById("header-principal");

  if (!main) {
    console.error("Elemento #main-content no encontrado");
    return;
  }

  if(seccion === 'expedientes'){
    if (header) header.style.display = "none";

    main.innerHTML = `
      <h2>Gestión de Expedientes</h2>
      <div class="d-flex justify-content-between mb-3">
        <input type="text" id="buscarExp" class="form-control w-50" placeholder="Buscar por nombre o número">
        <button class="btn btn-primary" id="btnNuevo">Nuevo Expediente</button>
      </div>
      <div id="formulario-expediente" style="display:none;"></div>
      <div id="lista-expedientes"></div>
    `;
    
    // Agregar event listeners de forma segura
    setTimeout(() => {
      const btnNuevo = document.getElementById('btnNuevo');
      const buscarExp = document.getElementById('buscarExp');
      
      if (btnNuevo) {
        btnNuevo.addEventListener('click', () => {
          const listaExpedientes = document.getElementById('lista-expedientes');
          if (listaExpedientes) {
            listaExpedientes.style.display = 'none';
          }
          mostrarFormulario();
        });
      }
      
      if (buscarExp) {
        buscarExp.addEventListener('input', filtrarLista);
      }
    }, 100);
    
    cargarLista();

  } else if(paginas[seccion]){
    if (header) header.style.display = "none";
    main.innerHTML = `<iframe src="${paginas[seccion]}"></iframe>`;

  } else {
    if (header) header.style.display = "flex";
    main.innerHTML = `<h2>${seccion}</h2><p>Contenido de ${seccion} aquí...</p>`;
  }
}

window.cambiarSucursal = async function(nombreSucursal) {
  try {
    const res = await fetch('/api/set-departamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departamento: nombreSucursal })
    });

    const data = await res.json();

    if (res.ok) {
      const sucursalTexto = document.getElementById("sucursalTexto");
      if (sucursalTexto) {
        sucursalTexto.textContent = (nombreSucursal === "admin") ? "Admin" : nombreSucursal;
      }

      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        if (nombreSucursal === "admin") {
          mainContent.innerHTML = `
            <div style="text-align:center; margin-top:40px;">
              <h1>Bienvenido</h1>
              <p>Selecciona una opción del menú.</p>
              <div style="margin-top:80px;">
                <img src="../uploads/logo-oftavision.png" 
                    alt="Instituto Oftavisión" 
                    style="max-width:900px; display:block; margin:0 auto;">
              </div>
            </div>
          `;
        } else {
          mainContent.innerHTML = `
            <div style="text-align:center; margin-top:40px;">
              <h1>Bienvenido a ${nombreSucursal}</h1>
              <p>Selecciona una opción del menú.</p>
              <div style="margin-top:80px;">
                <img src="../uploads/logo-oftavision.png" 
                    alt="Instituto Oftavisión" 
                    style="max-width:900px; display:block; margin:0 auto;">
              </div>
            </div>
          `;
        }
      }
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: data.error || "Error al cambiar sucursal"
      });
    }
  } catch (err) {
    console.error("Error cambiando sucursal:", err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error en la conexión con el servidor'
    });
  }
}

// Función para verificar si un elemento existe
function elementoExiste(id) {
  const elemento = document.getElementById(id);
  if (!elemento) {
    console.warn(`Elemento #${id} no encontrado`);
    return false;
  }
  return true;
}

// Función para agregar eventos de forma segura
function agregarEventoSeguro(elementoId, evento, callback) {
  const elemento = document.getElementById(elementoId);
  if (elemento) {
    elemento.addEventListener(evento, callback);
  }
}

// Inicialización segura cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  inicializarAplicacion();
});

async function inicializarAplicacion() {
  try {
    // Verificar sesión
    await verificarSesion();
    
    // Cargar menú si existe el elemento
    if (elementoExiste("menu-dinamico")) {
      await cargarMenu();
    }
    
    // Configurar notificaciones si existe el elemento
    if (elementoExiste("bell")) {
      configurarNotificaciones();
    }
    
  } catch (error) {
    console.error("Error inicializando aplicación:", error);
  }
}

async function verificarSesion() {
  try {
    const res = await fetch('/api/check-session');
    if (!res.ok) {
      window.location.href = '/login/login.html';
      return;
    }
    
    const data = await res.json();
    if (data.usuario) {
      window.usuarioRol = data.usuario.rol;

      // Mostrar selector solo si es admin
      if (data.usuario.rol === "admin" && elementoExiste("sucursal-selector")) {
        document.getElementById("sucursal-selector").style.display = "block";
      }

      // Mostrar la sucursal actual en el botón
      let sucursalActual;
      if (data.usuario.rol === "admin") {
        sucursalActual = data.usuario.sucursalSeleccionada || "Admin";
      } else {
        sucursalActual = data.usuario.departamento;
      }
      
      const sucursalTexto = document.getElementById("sucursalTexto");
      if (sucursalTexto) {
        sucursalTexto.textContent = sucursalActual;
      }

      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.innerHTML = `
          <div style="text-align:center; margin-top:40px;">
            <h1>Bienvenido</h1>
            <p>Selecciona una opción del menú.</p>
            <div style="margin-top:80px; text-align:left;">
              <img src="/uploads/logo-oftavision.png" 
                alt="Instituto Oftavisión" 
                style="max-width:900px; display:block; margin:0 auto;">
            </div>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error("Error verificando sesión:", error);
    window.location.href = '/login/login.html';
  }
}

// Función cerrar sesión
function cerrarSesion() {
  fetch('/api/logout')
    .then(() => window.location.href = '/login/login.html')
    .catch(err => console.error("Error al cerrar sesión:", err));
}

// Expedientes
function mostrarFormulario(expediente=null){
  const cont = document.getElementById('formulario-expediente');
  if (!cont) return;
  
  cont.style.display='block';
  cont.innerHTML = `
    <form id="form-expediente">
      <div class="mb-2">
        <label>Número de Expediente:</label>
        <input type="text" id="num_expediente" class="form-control" readonly>
      </div>
      <div class="mb-2"><label>Nombre:</label>
        <input type="text" id="nombre" class="form-control" required></div>
      <div class="mb-2"><label>Fecha de Nacimiento:</label>
        <input type="date" id="fecha_nac" class="form-control" required></div>
      <div class="mb-2"><label>Edad:</label>
        <input type="number" id="edad" class="form-control" readonly></div>
      <div class="mb-2"><label>Padecimiento:</label>
        <select id="padecimiento" class="form-select" required>
          <option value="">Seleccione...</option>
          <option value="DIABETES">DIABETES</option>
          <option value="HIPERTENSO">HIPERTENSO</option>
          <option value="NINGUNO">NINGUNO</option>
        </select>
      </div>
      <div class="mb-2"><label>Colonia:</label>
        <input type="text" id="colonia" class="form-control"></div>
      <div class="mb-2"><label>Ciudad:</label>
        <input type="text" id="ciudad" class="form-control"></div>
      <div class="mb-2"><label>Teléfono 1:</label>
        <input type="text" id="telefono1" class="form-control"></div>
      <div class="mb-2"><label>Teléfono 2:</label>
        <input type="text" id="telefono2" class="form-control"></div>
      <button type="submit" class="btn btn-success">Guardar</button>
      <button type="button" class="btn btn-secondary" onclick="cancelarFormulario()">Cancelar</button>
    </form>
  `;

  fetch('/api/expedientes').then(r=>r.json()).then(arr=>{
    const siguiente = expediente
      ? expediente.numero_expediente
      : (arr.length>0 ? arr[arr.length-1].numero_expediente+1 : 1).toString().padStart(4,'0');
      
    const numExpediente = document.getElementById('num_expediente');
    if (numExpediente) {
      numExpediente.value = siguiente;
    }
  });

  if(expediente){
    const formExpediente = document.getElementById('form-expediente');
    if (formExpediente) {
      formExpediente.dataset.editando = true;
    }
    
    const nombre = document.getElementById('nombre');
    if (nombre) nombre.value = expediente.nombre_completo;
    
    if(expediente.fecha_nacimiento){
      const f = new Date(expediente.fecha_nacimiento);
      const yyyy=f.getFullYear(), mm=String(f.getMonth()+1).padStart(2,'0'), dd=String(f.getDate()).padStart(2,'0');
      const fechaNac = document.getElementById('fecha_nac');
      if (fechaNac) fechaNac.value = `${yyyy}-${mm}-${dd}`;
    }
    
    const edad = document.getElementById('edad');
    if (edad) edad.value = expediente.edad;
    
    const padecimiento = document.getElementById('padecimiento');
    if (padecimiento) padecimiento.value = expediente.padecimientos;
    
    const colonia = document.getElementById('colonia');
    if (colonia) colonia.value = expediente.colonia;
    
    const ciudad = document.getElementById('ciudad');
    if (ciudad) ciudad.value = expediente.ciudad;
    
    const telefono1 = document.getElementById('telefono1');
    if (telefono1) telefono1.value = expediente.telefono1;
    
    const telefono2 = document.getElementById('telefono2');
    if (telefono2) telefono2.value = expediente.telefono2;
  } else {
    const formExpediente = document.getElementById('form-expediente');
    if (formExpediente) {
      formExpediente.dataset.editando = '';
    }
  }

  const fechaNac = document.getElementById('fecha_nac');
  if (fechaNac) {
    fechaNac.addEventListener('change', ()=>{
      const f = new Date(fechaNac.value);
      if(!isNaN(f)){
        const hoy = new Date();
        let edad = hoy.getFullYear()-f.getFullYear();
        const m = hoy.getMonth()-f.getMonth();
        if(m<0 || (m===0 && hoy.getDate()<f.getDate())) edad--;
        
        const edadInput = document.getElementById('edad');
        if (edadInput) {
          edadInput.value = edad;
        }
      }
    });
  }

  const formExpediente = document.getElementById('form-expediente');
  if (formExpediente) {
    formExpediente.addEventListener('submit', guardarExpediente);
  }
}

function cancelarFormulario(){
  const formularioExpediente = document.getElementById('formulario-expediente');
  const listaExpedientes = document.getElementById('lista-expedientes');
  
  if (formularioExpediente) formularioExpediente.style.display='none';
  if (listaExpedientes) listaExpedientes.style.display='block';
}

async function guardarExpediente(e){
  e.preventDefault();
  const id = document.getElementById('num_expediente')?.value;
  const nombre = document.getElementById('nombre')?.value;
  const fecha_nacimiento = document.getElementById('fecha_nac')?.value;

  if (!id || !nombre || !fecha_nacimiento) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Faltan datos requeridos'
    });
    return;
  }

  let metodo='POST', url='/api/expedientes';
  const formExpediente = document.getElementById('form-expediente');
  const edicion = formExpediente ? !!formExpediente.dataset.editando : false;

  if(edicion){
    metodo='PUT'; url=`/api/expedientes/${id}`;
  }else{
    try {
      const chk = await fetch(`/api/expedientes/check?nombre=${encodeURIComponent(nombre)}&fecha_nacimiento=${fecha_nacimiento}`);
      const existe = await chk.json();
      if(existe.existe){
        Swal.fire({
          icon: 'warning',
          title: 'Duplicado',
          text: 'El expediente ya existe'
        });
        return;
      }
    } catch (error) {
      console.error("Error verificando duplicado:", error);
    }
  }

  const data = {
    nombre_completo: nombre,
    fecha_nacimiento: fecha_nacimiento,
    edad: document.getElementById('edad')?.value || '',
    padecimientos: document.getElementById('padecimiento')?.value || '',
    colonia: document.getElementById('colonia')?.value || '',
    ciudad: document.getElementById('ciudad')?.value || '',
    telefono1: document.getElementById('telefono1')?.value || '',
    telefono2: document.getElementById('telefono2')?.value || ''
  };

  try {
    const res = await fetch(url,{method:metodo,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const json = await res.json();

    if(res.ok){
      Swal.fire({
        icon: 'success',
        title: edicion ? 'Expediente actualizado' : 'Expediente creado',
        text: json.mensaje || `Número: ${json.expediente?.numero_expediente}`
      });
      cancelarFormulario(); 
      cargarLista();
    }else{
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: json.error || 'No se pudo guardar el expediente'
      });
    }
  } catch (error) {
    console.error("Error guardando expediente:", error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error de conexión al guardar el expediente'
    });
  }
}

function cargarLista(){
  fetch('/api/expedientes').then(r=>r.json()).then(data=>{
    const listaExpedientes = document.getElementById('lista-expedientes');
    if (!listaExpedientes) return;
    
    let html = `<table class="table table-bordered align-middle">
      <thead>
        <tr>
          <th>Número</th><th>Nombre</th><th>Edad</th><th>Padecimiento</th>
          <th>Ciudad</th><th>Teléfono 1</th><th>Teléfono 2</th><th>Acciones</th>
        </tr>
      </thead><tbody>`;
    data.forEach(exp=>{
      html += `<tr>
        <td>${exp.numero_expediente}</td>
        <td>${exp.nombre_completo}</td>
        <td>${exp.edad}</td>
        <td>${exp.padecimientos}</td>
        <td>${exp.ciudad}</td>
        <td>${exp.telefono1}</td>
        <td>${exp.telefono2 || ''}</td>
        <td>
          <button class="btn-editar" onclick='editarExpediente(${JSON.stringify(exp)})'>Editar</button>
          <button class="btn-medico" onclick="verOrdenes(${exp.numero_expediente}, '${exp.nombre_completo.replace(/'/g,"\\'")}')">Médico</button>
          <button class="btn-opto" onclick="verOptometria(${exp.numero_expediente}, '${exp.nombre_completo.replace(/'/g,"\\'")}')">Optometría</button>
          ${window.usuarioRol === "admin" 
              ? `<button class="btn btn-danger" onclick="eliminarExpediente(${exp.numero_expediente})">Eliminar</button>` 
              : "" }
        </td>
      </tr>`;
    });
    html += `</tbody></table>`;
    listaExpedientes.innerHTML = html;
  }).catch(err => {
    console.error("Error cargando lista de expedientes:", err);
  });
}

function editarExpediente(exp){ 
  const listaExpedientes = document.getElementById('lista-expedientes');
  if (listaExpedientes) {
    listaExpedientes.style.display='none'; 
  }
  mostrarFormulario(exp); 
}

function filtrarLista(){
  const f = document.getElementById('buscarExp')?.value.toLowerCase() || '';
  document.querySelectorAll('#lista-expedientes tbody tr').forEach(row=>{
    row.style.display = row.innerText.toLowerCase().includes(f) ? '' : 'none';
  });
}

// ---------- Modal: Ver todas las órdenes ----------
async function verOrdenes(expedienteId, nombrePaciente=''){
  try{
    const res = await fetch(`/api/expedientes/${expedienteId}/ordenes`);
    const ordenes = await res.json();

    const cont = document.getElementById('contenedorOrdenes');
    const titulo = document.querySelector('#modalOrdenes .modal-title');
    
    if (titulo) {
      titulo.textContent = `Órdenes de ${nombrePaciente || 'Paciente'} (Expediente ${expedienteId})`;
    }

    if(!cont) return;

    if(!Array.isArray(ordenes) || ordenes.length===0){
      cont.innerHTML = `<div class="alert alert-warning mb-0">Este paciente aún no tiene órdenes médicas.</div>`;
    }else{
      let contenido = "";
      ordenes.forEach((orden, idx) => {
        contenido += `
          <h4 class="mt-3">Orden #${orden.numero_orden} ${idx===0 ? '(Más reciente)' : ''}</h4>
          <table class="table table-bordered table-sm">
            <tr><th>Número de Orden</th><td>${orden.numero_orden}</td></tr>
            <tr><th>Médico</th><td>${orden.medico}</td></tr>
            <tr><th>Diagnóstico</th><td>${orden.diagnostico}</td></tr>
            <tr><th>Lado</th><td>${orden.lado}</td></tr>
            <tr><th>Procedimiento</th><td>${orden.procedimiento}</td></tr>
            <tr><th>Precio</th><td>$${parseFloat(orden.precio||0).toFixed(2)}</td></tr>
            <tr><th>Estatus</th><td>${orden.estatus || 'Pendiente'}</td></tr>
            <tr><th>Fecha</th><td>${new Date(orden.fecha).toLocaleString()}</td></tr>
          </table>
          <h5 class="mt-3">Exploración Clínica</h5>
          <table class="table table-striped table-sm">
            <tr><th>Anexos</th><td>${orden.anexos || ''}</td></tr>
            <tr><th>Conjuntiva</th><td>${orden.conjuntiva || ''}</td></tr>
            <tr><th>Córnea</th><td>${orden.cornea || ''}</td></tr>
            <tr><th>Cámara Anterior</th><td>${orden.camara_anterior || ''}</td></tr>
            <tr><th>Cristalino</th><td>${orden.cristalino || ''}</td></tr>
            <tr><th>Retina</th><td>${orden.retina || ''}</td></tr>
            <tr><th>Mácula</th><td>${orden.macula || ''}</td></tr>
            <tr><th>Nervio Óptico</th><td>${orden.nervio_optico || ''}</td></tr>
            <tr><th>Ciclopejía</th><td>${orden.ciclopejia || ''}</td></tr>
            <tr><th>Hora T.P.</th><td>${orden.hora_tp || ''}</td></tr>
            <tr><th>Problemas Identificados</th><td>${orden.problemas || ''}</td></tr>
            <tr><th>Plan</th><td>${orden.plan || ''}</td></tr>
          </table>
          <hr/>
        `;
      });

      cont.innerHTML = contenido;
    }

    const modalElement = document.getElementById('modalOrdenes');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }catch(err){
    console.error('Error al cargar órdenes:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudieron cargar las órdenes de este paciente'
    });
  }
}

// ---------- Modal: Ver evaluaciones de optometría ----------
async function verOptometria(expedienteId, nombrePaciente=''){
  try{
    const res = await fetch(`/api/expedientes/${expedienteId}/optometria`);
    const evaluaciones = await res.json();

    const cont = document.getElementById('contenedorOrdenes');
    const titulo = document.querySelector('#modalOrdenes .modal-title');
    
    if (titulo) {
      titulo.textContent = `Optometría de ${nombrePaciente || 'Paciente'} (Expediente ${expedienteId})`;
    }

    if(!cont) return;

    if(!Array.isArray(evaluaciones) || evaluaciones.length===0){
      cont.innerHTML = `<div class="alert alert-warning mb-0">Este paciente aún no tiene evaluaciones de optometría.</div>`;
    }else{
      let contenido = "";
      evaluaciones.forEach((opto, idx) => {
        contenido += `
          <h4 class="mt-3">Evaluación #${opto.id} ${idx===0 ? '(Más reciente)' : ''}</h4>
          <table class="table table-bordered table-sm">
            <tr><th>OD Esfera</th><td>${opto.esfera_od || ''}</td></tr>
            <tr><th>OD Cilindro</th><td>${opto.cilindro_od || ''}</td></tr>
            <tr><th>OD Eje</th><td>${opto.eje_od || ''}</td></tr>
            <tr><th>OD AVcC</th><td>${opto.avcc_od || ''}</td></tr>
            <tr><th>OD Adición</th><td>${opto.adicion_od || ''}</td></tr>
            <tr><th>OD AVcC2</th><td>${opto.avcc2_od || ''}</td></tr>

            <tr><th>OI Esfera</th><td>${opto.esfera_oi || ''}</td></tr>
            <tr><th>OI Cilindro</th><td>${opto.cilindro_oi || ''}</td></tr>
            <tr><th>OI Eje</th><td>${opto.eje_oi || ''}</td></tr>
            <tr><th>OI AVcC</th><td>${opto.avcc_oi || ''}</td></tr>
            <tr><th>OI Adición</th><td>${opto.adicion_oi || ''}</td></tr>
            <tr><th>OI AVcC2</th><td>${opto.avcc2_oi || ''}</td></tr>

            <tr><th>BMP</th><td>${opto.bmp || ''}</td></tr>
            <tr><th>BMP OD</th><td>${opto.bmp_od || ''}</td></tr>
            <tr><th>BMP OI</th><td>${opto.bmp_oi || ''}</td></tr>

            <tr><th>F.O</th><td>${opto.fo || ''}</td></tr>
            <tr><th>F.O OD</th><td>${opto.fo_od || ''}</td></tr>
            <tr><th>F.O OI</th><td>${opto.fo_oi || ''}</td></tr>

            <tr><th>OD AV Lejos</th>
              <td>${[opto.av_lejos_od1, opto.av_lejos_od2, opto.av_lejos_od3].filter(Boolean).join('<br>')}</td>
            </tr>
            <tr><th>OD AV Cerca</th>
              <td>${[opto.av_cerca_od1, opto.av_cerca_od2].filter(Boolean).join('<br>')}</td>
            </tr>
            <tr><th>OD Con Lentes</th>
              <td>${[opto.av_lentes_od1, opto.av_lentes_od2].filter(Boolean).join('<br>')}</td>
            </tr>

            <tr><th>OI AV Lejos</th>
              <td>${[opto.av_lejos_oi1, opto.av_lejos_oi2, opto.av_lejos_oi3].filter(Boolean).join('<br>')}</td>
            </tr>
            <tr><th>OI AV Cerca</th>
              <td>${[opto.av_cerca_oi1, opto.av_cerca_oi2].filter(Boolean).join('<br>')}</td>
            </tr>
            <tr><th>OI Con Lentes</th>
              <td>${[opto.av_lentes_oi1, opto.av_lentes_oi2].filter(Boolean).join('<br>')}</td>
            </tr>

            <tr><th>Cicloplejia</th><td>${opto.cicloplejia || ''}</td></tr>
            <tr><th>Hora T.P.</th><td>${opto.hora_tp || ''}</td></tr>
            <tr><th>Fecha</th><td>${new Date(opto.fecha).toLocaleString()}</td></tr>
          </table>
          <hr/>
        `;
      });
      cont.innerHTML = contenido;
    }

    const modalElement = document.getElementById('modalOrdenes');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }catch(err){
    console.error('Error al cargar optometría:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudieron cargar las evaluaciones de optometría'
    });
  }
}

async function cargarMenu() {
  try {
    const menuDinamico = document.getElementById("menu-dinamico");
    if (!menuDinamico) return;

    const res = await fetch("/api/check-session");
    if (!res.ok) {
      menuDinamico.innerHTML = `
        <p>No tienes permisos asignados.</p>
        <a href="/login/login.html" class="btn btn-danger">Iniciar Sesión</a>
      `;
      return;
    }

    const data = await res.json();
    let permisos = [];

    if (data.usuario.rol === "admin") {
      permisos = [
        "expedientes","recibos","cierredecaja","medico",
        "ordenes","optometria","insumos","usuarios",
        "agendaquirurgica","asignarmodulos"
      ];
    } else {
      const permisosRes = await fetch("/api/mis-permisos");
      if (!permisosRes.ok) {
        menuDinamico.innerHTML = `
          <p class="text-danger">Error cargando permisos. Contacta al administrador.</p>
        `;
        return;
      }

      const permisosData = await permisosRes.json();
      permisos = Array.isArray(permisosData)
        ? permisosData.filter(p => p.permitido).map(p => p.modulo)
        : [];
    }

    let html = "";

    if (permisos.includes("expedientes")) {
      html += `<a href="#" onclick="mostrarSeccion('expedientes')"><i class="material-icons">folder</i> Expedientes</a>`;
    }
    if (permisos.includes("optometria")) {
      html += `<a href="#" onclick="mostrarSeccion('optometria')"><i class="material-icons">visibility</i> Optometría</a>`;
    }
    if (permisos.includes("recibos")) {
      html += `<a href="#" onclick="mostrarSeccion('recibos')"><i class="material-icons">receipt</i> Recibos</a>`;
    }
    if (permisos.includes("medico")) {
      html += `<a href="#" onclick="mostrarSeccion('medico')"><i class="material-icons">healing</i> Módulo Médico</a>`;
    }
    if (permisos.includes("agendaquirurgica")) {
      html += `<a href="#" onclick="mostrarSeccion('agendaquirurgica')"><i class="material-icons">event</i> Agenda Quirúrgica</a>`;
    }
    if (permisos.includes("ordenes")) {
      html += `<a href="#" onclick="mostrarSeccion('ordenes')"><i class="material-icons">assignment</i> Órdenes</a>`;
    }
    if (permisos.includes("cierredecaja")) {
      html += `<a href="#" onclick="mostrarSeccion('cierredecaja')"><i class="material-icons">attach_money</i> Cierre de Caja</a>`;
    }
    if (permisos.includes("insumos")) {
      html += `<a href="#" onclick="mostrarSeccion('insumos')"><i class="material-icons">inventory</i> Insumos</a>`;
    }
    
    if (permisos.includes("asignarmodulos") || permisos.includes("usuarios")) {
      html += `<hr class="text-white opacity-50">`;
    }
    if (permisos.includes("asignarmodulos")) {
      html += `<a href="#" onclick="mostrarSeccion('asignarmodulos')"><i class="material-icons">settings</i> Asignar Módulos</a>`;
    }
    if (permisos.includes("usuarios")) {
      html += `<a href="#" onclick="mostrarSeccion('usuarios')"><i class="material-icons">group</i> Usuarios</a>`;
    }

    menuDinamico.innerHTML = html || `<p class="text-warning">No tienes módulos asignados. Contacta al administrador.</p>`;
  } catch (err) {
    console.error("Error cargando menú:", err);
    const menuDinamico = document.getElementById("menu-dinamico");
    if (menuDinamico) {
      menuDinamico.innerHTML = `
        <p class="text-danger">Error cargando menú. Intenta recargar la página.</p>
      `;
    }
  }
}

// ---------- Función para eliminar expediente ----------
async function eliminarExpediente(id){
  const confirmacion = await Swal.fire({
    title: '¿Estás seguro?',
    text: 'Esto eliminará el expediente permanentemente',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, eliminar'
  });

  if(confirmacion.isConfirmed){
    try {
      const res = await fetch(`/api/expedientes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if(res.ok){
        Swal.fire('Eliminado', data.mensaje, 'success');
        cargarLista();
      }else{
        Swal.fire('Error', data.error || 'No se pudo eliminar', 'error');
      }
    } catch (error) {
      console.error("Error eliminando expediente:", error);
      Swal.fire('Error', 'Error de conexión al eliminar el expediente', 'error');
    }
  }
}

// ========== Usuario en el header ==========
function cargarUsuarioHeader() {
  fetch('/api/check-session')
    .then(res => res.json())
    .then(data => {
      if (data.usuario) {
        const avatar = document.getElementById("userAvatar");
        if (avatar) {
          avatar.textContent = data.usuario.username.charAt(0).toUpperCase();
        }

        const nombre = document.getElementById("nombreUsuario");
        if (nombre) {
          nombre.textContent = data.usuario.username;
        }
      }
    })
    .catch(err => console.error("Error cargando usuario header:", err));
}

// ========== Notificaciones ==========
function configurarNotificaciones() {
  const bell = document.getElementById("bell");
  const notifDropdown = document.getElementById("notif-dropdown");
  const notifList = document.getElementById("notif-list");
  const notifCount = document.getElementById("notif-count");

  if (!bell || !notifDropdown) return;

  async function cargarNotificaciones() {
    try {
      const res = await fetch("/api/notificaciones");
      if (!res.ok) throw new Error("Error al cargar notificaciones");
      const data = await res.json();

      if (!notifList) return;

      notifList.innerHTML = "";

      if (data.length === 0) {
        notifList.innerHTML = `<li class="px-3 py-2 text-muted">No hay notificaciones</li>`;
        if (notifCount) {
          notifCount.style.display = "none";
        }
        return;
      }

      data.forEach(n => {
        const li = document.createElement("li");
        li.className = "px-3 py-2 border-bottom";
        li.textContent = `${n.mensaje} — ${new Date(n.fecha).toLocaleString()}`;
        notifList.appendChild(li);
      });

      if (notifCount) {
        notifCount.textContent = data.length;
        notifCount.style.display = "inline-block";
      }
    } catch (err) {
      console.error("❌ Error mostrando notificaciones:", err);
    }
  }

  bell.addEventListener("click", async () => {
    notifDropdown.classList.toggle("show");
    if (notifDropdown.classList.contains("show")) {
      await cargarNotificaciones();
    }
  });
}

// ======================== Gestión de A_MODULOS.HTML =======================================/
// Lista de módulos con sus íconos
const modules = [
  { id: 'expedientes', name: 'Expedientes', icon: 'fas fa-folder' },
  { id: 'recibos', name: 'Recibos', icon: 'fas fa-receipt' },
  { id: 'cierredecaja', name: 'Cierre de Caja', icon: 'fas fa-calculator' },
  { id: 'medico', name: 'Módulo Médico', icon: 'fas fa-stethoscope' },
  { id: 'ordenes', name: 'Órdenes', icon: 'fas fa-clipboard-list' },
  { id: 'optometria', name: 'Optometría', icon: 'fas fa-glasses' },
  { id: 'insumos', name: 'Insumos', icon: 'fas fa-boxes' },
  { id: 'usuarios', name: 'Usuarios', icon: 'fas fa-users' },
  { id: 'agendaquirurgica', name: 'Agenda Quirúrgica', icon: 'fas fa-calendar-check' },
  { id: 'asignarmodulos', name: 'Asignar Módulos', icon: 'fas fa-tasks' }
];

// Cargar usuarios y módulos al iniciar
if (elementoExiste("modulesContainer")) {
  document.addEventListener("DOMContentLoaded", function() {
    cargarUsuarios();
    renderModules();
  });
}

// Renderizar los módulos en la cuadrícula
function renderModules() {
  const container = document.getElementById('modulesContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  modules.forEach(module => {
    const moduleElement = document.createElement('div');
    moduleElement.className = 'module-item';
    moduleElement.innerHTML = `
      <input type="checkbox" id="mod_${module.id}" value="${module.id}" class="form-check-input">
      <label for="mod_${module.id}" class="form-check-label">
        <i class="${module.icon}"></i> ${module.name}
      </label>
    `;
    container.appendChild(moduleElement);
  });
}

// Cargar usuarios desde la API
async function cargarUsuarios(){
  const select = document.getElementById("usuario");
  if (!select) return;
  
  select.innerHTML = "<option value=''>Seleccione un usuario...</option>";
  
  try {
    const res = await fetch("/api/usuarios");
    const data = await res.json();
    
    if(res.ok){
      data.forEach(u => {
        select.innerHTML += `<option value="${u.nomina}">${u.username} (${u.departamento}) - ${u.nomina}</option>`;
      });
    } else {
      mostrarError("Error al cargar usuarios", data.error || "No se pudieron cargar los usuarios");
    }
  } catch(err){
    console.error(err);
    mostrarError("Error de conexión", "No se pudo conectar al servidor para cargar los usuarios");
  }
}

// Cuando se selecciona un usuario, cargar sus permisos
if (elementoExiste("usuario")) {
  document.getElementById("usuario").addEventListener("change", async (e) => {
    const nomina = e.target.value;
    const userInfo = document.getElementById('userInfo');
    
    if (userInfo) userInfo.style.display = 'none';
    
    document.querySelectorAll('.module-item input').forEach(chk => chk.checked = false);
    
    if(!nomina) return;

    try {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const userName = selectedOption.text.split(' (')[0];
      const userDepto = selectedOption.text.match(/\((.*?)\)/)[1];
      
      if (userInfo) {
        document.getElementById('selectedUserName').textContent = userName;
        document.getElementById('selectedUserNomina').textContent = nomina;
        document.getElementById('selectedUserDepto').textContent = userDepto;
        userInfo.style.display = 'block';
      }
      
      if (userName.toLowerCase().includes('admin') || nomina === 'admin') {
        document.querySelectorAll('.module-item input').forEach(chk => {
          chk.checked = true;
          chk.disabled = true;
        });
        return;
      } else {
        document.querySelectorAll('.module-item input').forEach(chk => chk.disabled = false);
      }

      const res = await fetch(`/api/permisos/${nomina}`);
      const permisos = await res.json();

      if (res.ok) {
        permisos.forEach(p => {
          const chk = document.querySelector(`.module-item input[value="${p.modulo}"]`);
          if (chk) chk.checked = p.permitido;
        });
      }
    } catch (err) {
      console.error(err);
      mostrarError("Error", "No se pudieron cargar los permisos del usuario");
    }
  });
}

// Guardar permisos
async function guardarPermisos(){
  const usuarioSelect = document.getElementById('usuario');
  if (!usuarioSelect) return;
  
  const nomina = usuarioSelect.value;
  
  if(!nomina){
    mostrarError("Usuario no seleccionado", "Debes seleccionar un usuario para asignar permisos");
    return;
  }

  const permisos = [];
  document.querySelectorAll('.module-item input').forEach(chk => {
    permisos.push({ 
      modulo: chk.value, 
      permitido: chk.checked 
    });
  });

  try {
    const res = await fetch(`/api/permisos/${nomina}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ permisos })
    });
    
    const data = await res.json();
    
    if(res.ok){
      mostrarExito("¡Permisos actualizados!", "Los permisos se han guardado correctamente.");
    } else {
      mostrarError("Error al guardar", data.error || "No se pudieron guardar los permisos");
    }
  } catch(err){
    mostrarError("Error de conexión", "No se pudo conectar al servidor para guardar los permisos");
  }
}

// Seleccionar todos los módulos
function selectAll() {
  document.querySelectorAll('.module-item input').forEach(chk => chk.checked = true);
}

// Deseleccionar todos los módulos
function deselectAll() {
  document.querySelectorAll('.module-item input').forEach(chk => chk.checked = false);
}

// Mostrar mensaje de éxito
function mostrarExito(titulo, mensaje) {
  const successAlert = document.getElementById('successAlert');
  const successMessage = document.getElementById('successMessage');
  
  if (successMessage) {
    successMessage.textContent = mensaje;
  }
  if (successAlert) {
    successAlert.style.display = 'block';
    
    setTimeout(() => {
      successAlert.style.display = 'none';
    }, 5000);
  }
  
  Swal.fire({
    icon: 'success',
    title: titulo,
    text: mensaje,
    timer: 3000,
    showConfirmButton: false
  });
}

// Mostrar error
function mostrarError(titulo, mensaje) {
  Swal.fire({
    icon: 'error',
    title: titulo,
    text: mensaje
  });
}

// =================================== GESTION DE A_QUIRUGICA ===============================/
if (window.location.pathname.includes("a_quirurgica.html")) {
  // ====================== VARIABLES GLOBALES ======================
  let fechaCirugia = new Date();
  let ordenSeleccionada = null;

  // ====================== TABLA ======================
  async function cargarOrdenes(year, month) {
    try {
      const res = await fetch('/api/ordenes');
      let ordenes = await res.json();

      if (year !== undefined && month !== undefined) {
        ordenes = ordenes.filter(o => {
          if (!o.fecha_cirugia) return true;
          const f = new Date(o.fecha_cirugia);
          return f.getFullYear() === year && f.getMonth() === month;
        });
      }

      const tablaOrdenes = document.getElementById("tablaOrdenes");
      if (!tablaOrdenes) return;

      tablaOrdenes.innerHTML = ordenes.map(o => `
        <tr>
          <td>${o.expediente}</td>
          <td>${o.edad}</td>
          <td>${o.nombre}</td>
          <td>${o.procedimiento}</td>
          <td>$${o.total}</td>
          <td>$${o.pagos}</td>
          <td>$${o.total - o.pagos}</td>
          <td><span class="badge ${o.status === 'Completado' ? 'bg-success' : 'bg-warning'}">${o.status}</span></td>
          <td>
            ${o.tipo_lente 
              ? `<span class="badge bg-info" style="cursor:pointer" onclick="editarLente(${o.id}, '${o.tipo_lente}')">${o.tipo_lente}</span>` 
              : `<button class="btn btn-sm btn-secondary" 
                        onclick="editarLente(${o.id}, '')">
                   <i class="fas fa-plus-circle"></i> Añadir Lente
                 </button>`}
          </td>
          <td>
            ${o.fecha_cirugia ? 
              '<span class="text-muted">Asignado</span>' : 
              `<button class="btn btn-sm btn-primary" 
                      onclick="abrirCalendario(${o.id})">
                <i class="fas fa-calendar-plus"></i> Agendar
              </button>
              `}
            ${o.fecha_cirugia ? `
              <button class="btn btn-sm btn-warning mt-1" 
                      onclick="editarCirugia(${o.id})">
                <i class="fas fa-edit"></i> Reprogramar
              </button>
            ` : ''}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error("Error cargando órdenes:", err);
      mostrarError("Error", "No se pudieron cargar las órdenes");
    }
  }

  // ====================== CALENDARIO ======================
  if (elementoExiste("calendarioCirugias")) {
    document.addEventListener("DOMContentLoaded", () => {
      renderCalendarCirugias();
    });
  }

  function getColorClass(proc) {
    const texto = proc.toLowerCase();

    if (texto.includes("catarata")) return "proc-catarata";
    if (texto.includes("consulta")) return "proc-consulta";
    if (texto.includes("lente")) return "proc-lente";

    return "";
  }

  async function renderCalendarCirugias() {
    const calendario = document.getElementById("calendarioCirugias");
    const mesActual = document.getElementById("mesCirugia");

    if (!calendario || !mesActual) return;

    const year = fechaCirugia.getFullYear();
    const month = fechaCirugia.getMonth();

    mesActual.textContent = fechaCirugia.toLocaleString("es-ES", { month: "long", year: "numeric" });

    const primerDia = new Date(year, month, 1).getDay() || 7;
    const diasEnMes = new Date(year, month + 1, 0).getDate();

    let cirugias = [];
    try {
      const res = await fetch("/api/cirugias");
      cirugias = await res.json();
    } catch (err) { 
      console.error(err); 
    }

    const filtradas = cirugias.filter(c => {
      const f = new Date(c.fecha);
      return f.getFullYear() === year && f.getMonth() === month;
    });

    calendario.innerHTML = "";

    ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].forEach(d => {
      calendario.innerHTML += `<div class="day-header">${d}</div>`;
    });

    for (let i = 1; i < primerDia; i++) {
      calendario.innerHTML += `<div class="empty-day"></div>`;
    }

    for (let d = 1; d <= diasEnMes; d++) {
      const fechaDia = new Date(year, month, d).toISOString().split("T")[0];
      const programadas = filtradas.filter(c => c.fecha.startsWith(fechaDia));

      let contenido = `<div class="calendar-day" onclick="asignarFecha('${fechaDia}')">
                     <div class="day-number">${d}</div>`;
      if (programadas.length > 0) {
        programadas.forEach(c => {
          contenido += `
            <div class="insumo-item ${getColorClass(c.procedimiento)}">
              <div class="insumo-name">${c.nombre}</div>
              <div class="insumo-info">Proc: ${c.procedimiento}</div>
              <div class="insumo-info">Dr: ${c.medico}</div>
              ${c.tipo_lente ? `<div class="insumo-info">Lente: ${c.tipo_lente}</div>` : ""}
              <button class="btn btn-sm btn-danger mt-1" onclick="event.stopPropagation(); eliminarCirugia(${c.id})">
                <i class="fas fa-trash"></i> Eliminar
              </button>
            </div>`;
        });
      }
      contenido += "</div>";
      calendario.innerHTML += contenido;
    }

    cargarOrdenes(year, month);
  }

  function cambiarMesCirugia(offset) {
    fechaCirugia.setMonth(fechaCirugia.getMonth() + offset);
    renderCalendarCirugias();
  }

  // ==================== AGENDAR CIRUGÍA ====================
  function agendarCirugia(idOrden) {
    Swal.fire({
      title: 'Asignar fecha de cirugía',
      input: 'date',
      showCancelButton: true,
      confirmButtonText: 'Asignar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const fecha = result.value;
        try {
          await fetch(`/api/ordenes/${idOrden}/agendar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha_cirugia: fecha })
          });
          mostrarExito("Cirugía agendada", "La cirugía ha sido agendada correctamente");
          renderCalendarCirugias();
        } catch (err) {
          console.error("Error al agendar:", err);
          mostrarError("Error", "No se pudo agendar la cirugía");
        }
      }
    });
  }

  window.editarCirugia = function(idOrden) {
    ordenSeleccionada = idOrden;
    const modalElement = document.getElementById("modalCalendario");
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // ==================== EDITAR TIPO DE LENTE ====================
  function editarLente(idOrden, tipoActual) {
    Swal.fire({
      title: tipoActual ? 'Editar Tipo de Lente' : 'Añadir Tipo de Lente',
      input: 'text',
      inputValue: tipoActual || '',
      inputPlaceholder: 'Ejemplo: Lente Intraocular',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: (valor) => {
        if (!valor.trim()) {
          Swal.showValidationMessage('Debes ingresar un tipo de lente');
        }
        return valor;
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await fetch(`/api/ordenes/${idOrden}/lente`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo_lente: result.value })
          });
          mostrarExito("Tipo de lente actualizado", "El tipo de lente fue actualizado correctamente");
          renderCalendarCirugias();
        } catch (err) {
          console.error("Error al actualizar tipo de lente:", err);
          mostrarError("Error", "No se pudo actualizar el tipo de lente");
        }
      }
    });
  }

  window.abrirCalendario = function(idOrden) {
    ordenSeleccionada = idOrden;
    const modalElement = document.getElementById("modalCalendario");
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // ==================== ASIGNAR FECHA DESDE EL CALENDARIO ====================
  window.asignarFecha = async function(fecha) {
    if (!ordenSeleccionada) return;

    try {
      await fetch(`/api/ordenes/${ordenSeleccionada}/agendar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha_cirugia: fecha })
      });
      mostrarExito("Cirugía asignada", `Fecha: ${fecha}`);

      ordenSeleccionada = null;
      renderCalendarCirugias();

      const modalElement = document.getElementById("modalCalendario");
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
      }
    } catch (err) {
      console.error("Error al asignar cirugía:", err);
      mostrarError("Error", "No se pudo asignar la cirugía");
    }
  }

  // ==================== ELIMINAR CIRUGÍA ====================
  window.eliminarCirugia = function(idOrden) {
    Swal.fire({
      title: '¿Eliminar cirugía?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await fetch(`/api/ordenes/${idOrden}/agendar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha_cirugia: null })
          });
          mostrarExito("Cirugía eliminada", "La cirugía ha sido eliminada del calendario");
          renderCalendarCirugias();
        } catch (err) {
          console.error("Error al eliminar cirugía:", err);
          mostrarError("Error", "No se pudo eliminar la cirugía");
        }
      }
    });
  }
}

// ==================== GESTION DE CIERRE-CAJA ============================//
if (window.location.pathname.includes("cierre-caja.html")) {
  async function cargarCierre() {
    const fechaInput = document.getElementById("fechaCierre");
    if (!fechaInput) return;
    
    const fecha = fechaInput.value;

    if (!fecha) {
      Swal.fire({
        icon: 'warning',
        title: 'Fecha requerida',
        text: 'Debes seleccionar una fecha para generar el reporte.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    try {
      Swal.fire({
        title: 'Generando cierre...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const resResumen = await fetch(`/api/cierre-caja?fecha=${fecha}`);
      const datosResumen = await resResumen.json();

      Swal.close();

      const tbodyResumen = document.getElementById("tbodyResumen");
      if (!tbodyResumen) return;

      if (!Array.isArray(datosResumen) || datosResumen.length === 0) {
        tbodyResumen.innerHTML = "<tr><td colspan='5'>Sin datos</td></tr>";
        Swal.fire({
          icon: 'info',
          title: 'Sin datos',
          text: 'No se encontraron registros para la fecha seleccionada.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }

      const procedimientos = [...new Set(datosResumen.map(d => d.procedimiento))];
      const pagos = {};
      datosResumen.forEach(d => {
        if (!pagos[d.pago]) pagos[d.pago] = {};
        if (!pagos[d.pago][d.procedimiento]) pagos[d.pago][d.procedimiento] = 0;
        pagos[d.pago][d.procedimiento] += parseFloat(d.total);
      });

      let thead = `<tr><th>Forma de Cobro</th>`;
      procedimientos.forEach(p => { thead += `<th>${p}</th>`; });
      thead += `<th>Total</th></tr>`;
      
      const theadElement = document.querySelector("#tablaResumen thead");
      if (theadElement) {
        theadElement.innerHTML = thead;
      }

      let tbody = "";
      const totalesColumnas = {};
      Object.keys(pagos).forEach(pago => {
        let totalFila = 0;
        let fila = `<tr><td>${pago}</td>`;
        procedimientos.forEach(proc => {
          const val = pagos[pago][proc] || 0;
          totalFila += val;
          totalesColumnas[proc] = (totalesColumnas[proc] || 0) + val;
          fila += `<td>$${val.toFixed(2)}</td>`;
        });
        fila += `<td class="fw-bold">$${totalFila.toFixed(2)}</td></tr>`;
        tbody += fila;
      });

      let filaTotal = `<tr class="table-dark"><td><b>Total</b></td>`;
      let totalGeneral = 0;
      procedimientos.forEach(proc => {
        const val = totalesColumnas[proc] || 0;
        totalGeneral += val;
        filaTotal += `<td><b>$${val.toFixed(2)}</b></td>`;
      });
      filaTotal += `<td><b>$${totalGeneral.toFixed(2)}</b></td></tr>`;
      tbody += filaTotal;

      tbodyResumen.innerHTML = tbody;

      const resPacientes = await fetch(`/api/listado-pacientes?fecha=${fecha}`);
      const pacientes = await resPacientes.json();
      
      const tablaPacientes = document.getElementById("tablaPacientes");
      if (tablaPacientes) {
        tablaPacientes.innerHTML = pacientes.map(p => `
          <tr>
            <td>${p.fecha}</td>
            <td>${p.folio}</td>
            <td>${p.nombre}</td>
            <td>${p.procedimiento}</td>
            <td>${p.status}</td>
            <td>${p.pago}</td>
            <td><span class="badge bg-primary">$${parseFloat(p.total).toFixed(2)}</span></td>
            <td><span class="badge bg-warning text-dark">$${parseFloat(p.saldo).toFixed(2)}</span></td>
          </tr>
        `).join('');
      }
    } catch (error) {
      console.error("Error cargando cierre de caja:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al cargar los datos del cierre.',
        confirmButtonColor: '#d33'
      });
    }
  }

  function exportarExcel() {
    const fechaInput = document.getElementById("fechaCierre");
    if (!fechaInput) return;
    
    const fecha = fechaInput.value || "sin_fecha";

    const tablaResumen = document.getElementById("tablaResumen");
    const tablaPacientesWrap = document.getElementById("tablaPacientesWrap");

    if (!tablaResumen || !tablaPacientesWrap) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontraron las tablas para exportar',
        confirmButtonColor: '#d33'
      });
      return;
    }

    const wb = XLSX.utils.book_new();
    const wsResumen = XLSX.utils.table_to_sheet(tablaResumen);
    const wsPacientes = XLSX.utils.table_to_sheet(tablaPacientesWrap);

    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
    XLSX.utils.book_append_sheet(wb, wsPacientes, "Pacientes");

    XLSX.writeFile(wb, `cierre_${fecha}.xlsx`);

    Swal.fire({
      icon: 'success',
      title: 'Exportación completada',
      text: `El archivo cierre_${fecha}.xlsx se descargó correctamente.`,
      confirmButtonColor: '#27ae60'
    });
  }
}

// ========================================GESTION DE EXPEDIENTES========================================///
if (window.location.pathname.includes("a_expedientes.html")) {
  async function cargarExpedientes() {
    try {
      const res = await fetch('/api/expedientes');
      const data = await res.json();
      const tbody = document.getElementById('listaExpedientes');
      if (!tbody) return;
      
      tbody.innerHTML = '';

      const usuario = { rol: window.usuarioRol || "usuario" };

      data.forEach(exp => {
        tbody.innerHTML += `
          <tr>
            <td>${exp.numero_expediente}</td>
            <td>${exp.nombre_completo}</td>
            <td>${exp.edad}</td>
            <td>${exp.padecimientos}</td>
            <td>${exp.colonia}</td>
            <td>${exp.ciudad}</td>
            <td>${exp.telefono1}</td>
            <td>${exp.telefono2 || ''}</td>
            <td>
              <button class="btn-editar" onclick="editarExpediente(${exp.numero_expediente})">Editar</button>
              <button class="btn-medico" onclick="verMedico(${exp.numero_expediente}, '${exp.nombre_completo}')">Médico</button>
              <button class="btn-opto" onclick="verOptometria(${exp.numero_expediente}, '${exp.nombre_completo}')">Optometría</button>
              ${usuario?.rol === "admin" 
                  ? `<button class="btn-cancelar" onclick="eliminarExpediente(${exp.numero_expediente})">Eliminar</button>` 
                  : "" }
            </td>
          </tr>
        `;
      });
    } catch (error) {
      console.error("Error cargando expedientes:", error);
    }
  }

  function nuevoExpediente() {
    const expedienteForm = document.getElementById('expedienteForm');
    if (!expedienteForm) return;
    
    expedienteForm.reset();
    const numeroExpediente = document.getElementById('numero_expediente');
    if (numeroExpediente) numeroExpediente.value = '';
    expedienteForm.style.display = 'block';
  }

  function cancelarFormulario() {
    const expedienteForm = document.getElementById('expedienteForm');
    if (expedienteForm) expedienteForm.style.display = 'none';
  }

  function calcularEdad() {
    const fecha = document.getElementById('fecha_nacimiento')?.value;
    if (fecha) {
      const nacimiento = new Date(fecha);
      const hoy = new Date();
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
      const edadInput = document.getElementById('edad');
      if (edadInput) edadInput.value = edad;
    }
  }

  async function guardarExpediente(e) {
    e.preventDefault();
    const expediente = {
      nombre_completo: document.getElementById('nombre')?.value || '',
      fecha_nacimiento: document.getElementById('fecha_nacimiento')?.value || '',
      edad: document.getElementById('edad')?.value || '',
      padecimientos: document.getElementById('padecimientos')?.value || '',
      colonia: document.getElementById('colonia')?.value || '',
      ciudad: document.getElementById('ciudad')?.value || '',
      telefono1: document.getElementById('telefono1')?.value || '',
      telefono2: document.getElementById('telefono2')?.value || ''
    };

    try {
      const res = await fetch('/api/expedientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expediente)
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Expediente creado',
          text: `Número: ${data.expediente.numero_expediente}`,
          confirmButtonColor: '#3085d6'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.error || 'No se pudo crear el expediente',
          confirmButtonColor: '#d33'
        });
      }

      cargarExpedientes();
      cancelarFormulario();
    } catch (error) {
      console.error("Error guardando expediente:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error de conexión al guardar el expediente',
        confirmButtonColor: '#d33'
      });
    }
  }

  async function editarExpediente(id) {
    try {
      const res = await fetch(`/api/expedientes/${id}`);
      const data = await res.json();

      const numeroExpediente = document.getElementById('numero_expediente');
      const nombre = document.getElementById('nombre');
      const fechaNacimiento = document.getElementById('fecha_nacimiento');
      const edad = document.getElementById('edad');
      const padecimientos = document.getElementById('padecimientos');
      const colonia = document.getElementById('colonia');
      const ciudad = document.getElementById('ciudad');
      const telefono1 = document.getElementById('telefono1');
      const telefono2 = document.getElementById('telefono2');
      const expedienteForm = document.getElementById('expedienteForm');

      if (numeroExpediente) numeroExpediente.value = data.numero_expediente;
      if (nombre) nombre.value = data.nombre_completo;
      if (fechaNacimiento) fechaNacimiento.value = data.fecha_nacimiento.split('T')[0];
      if (edad) edad.value = data.edad;
      if (padecimientos) padecimientos.value = data.padecimientos;
      if (colonia) colonia.value = data.colonia;
      if (ciudad) ciudad.value = data.ciudad;
      if (telefono1) telefono1.value = data.telefono1;
      if (telefono2) telefono2.value = data.telefono2;
      if (expedienteForm) expedienteForm.style.display = 'block';
    } catch (error) {
      console.error("Error editando expediente:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar los datos del expediente',
        confirmButtonColor: '#d33'
      });
    }
  }

  async function buscarExpediente() {
    const buscarInput = document.getElementById('buscarInput');
    if (!buscarInput) return;
    
    const folio = buscarInput.value.trim();
    if (!folio) return cargarExpedientes();

    try {
      const res = await fetch(`/api/expedientes/${folio}`);
      if (res.ok) {
        const data = await res.json();
        const usuario = { rol: window.usuarioRol || "usuario" };

        const listaExpedientes = document.getElementById('listaExpedientes');
        if (listaExpedientes) {
          listaExpedientes.innerHTML = `
            <tr>
              <td>${data.numero_expediente}</td>
              <td>${data.nombre_completo}</td>
              <td>${data.edad}</td>
              <td>${data.padecimientos}</td>
              <td>${data.colonia}</td>
              <td>${data.ciudad}</td>
              <td>${data.telefono1}</td>
              <td>${data.telefono2 || ''}</td>
              <td>
                <button class="btn-editar" onclick="editarExpediente(${data.numero_expediente})">Editar</button>
                <button class="btn-medico" onclick="verMedico(${data.numero_expediente}, '${data.nombre_completo}')">Médico</button>
                <button class="btn-opto" onclick="verOptometria(${data.numero_expediente}, '${data.nombre_completo}')">Optometría</button>
                ${usuario.rol === "admin" 
                    ? `<button class="btn-cancelar" onclick="eliminarExpediente(${data.numero_expediente})">Eliminar</button>` 
                    : "" }
              </td>
            </tr>
          `;
        }
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'No encontrado',
          text: 'No existe un expediente con ese folio'
        });
        const listaExpedientes = document.getElementById('listaExpedientes');
        if (listaExpedientes) {
          listaExpedientes.innerHTML = `<tr><td colspan="9">No encontrado</td></tr>`;
        }
      }
    } catch (error) {
      console.error("Error buscando expediente:", error);
    }
  }

  // === VER ORDENES MÉDICAS ===
  async function verMedico(expedienteId, nombre) {
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/ordenes`);
      const data = await res.json();

      if (!data.length) {
        Swal.fire({
          icon: 'info',
          title: 'Sin órdenes',
          text: 'No hay órdenes médicas registradas para este expediente.'
        });
        return;
      }

      let contenido = "";
      data.forEach((orden, idx) => {
        contenido += `
        <h4 class="mt-3">Orden #${orden.numero_orden} ${idx === 0 ? '(Más reciente)' : ''}</h4>
        <table class="table table-bordered">
          <tr><th>Médico</th><td>${orden.medico}</td></tr>
          <tr><th>Diagnóstico</th><td>${orden.diagnostico}</td></tr>
          <tr><th>Lado</th><td>${orden.lado}</td></tr>
          <tr><th>Procedimiento</th><td>${orden.procedimiento}</td></tr>
          <tr><th>Precio</th><td>$${orden.precio || ''}</td></tr>
          <tr><th>Estatus</th><td>${orden.estatus}</td></tr>
          <tr><th>Fecha</th><td>${new Date(orden.fecha).toLocaleString()}</td></tr>
        </table>
        <hr/>
        `;
      });

      Swal.fire({
        title: `Órdenes de ${nombre} (Expediente ${expedienteId})`,
        html: contenido,
        width: '60%',
        confirmButtonText: 'Cerrar'
      });
    } catch (error) {
      console.error("Error cargando órdenes médicas:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar las órdenes médicas'
      });
    }
  }

  // === VER OPTOMETRÍA ===
  async function verOptometria(expedienteId, nombre) {
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/optometria`);
      const data = await res.json();

      if (!data.length) {
        Swal.fire({
          icon: 'info',
          title: 'Sin registros',
          text: 'No hay evaluaciones de optometría registradas para este expediente.'
        });
        return;
      }

      let contenido = "";
      data.forEach((opto, idx) => {
        contenido += `
        <h4 class="mt-3">Evaluación #${opto.id} ${idx === 0 ? '(Más reciente)' : ''}</h4>
        <table class="table table-bordered">
          <!-- 👁️ Ojo Derecho -->
          <tr><th colspan="2" class="table-secondary text-center">Ojo Derecho (OD)</th></tr>
          <tr><th>Esfera</th><td>${opto.esfera_od || ''}</td></tr>
          <tr><th>Cilindro</th><td>${opto.cilindro_od || ''}</td></tr>
          <tr><th>Eje</th><td>${opto.eje_od || ''}</td></tr>
          <tr><th>AVcC</th><td>${opto.avcc_od || ''}</td></tr>
          <tr><th>Adición</th><td>${opto.adicion_od || ''}</td></tr>
          <tr><th>AVcC2</th><td>${opto.avcc2_od || ''}</td></tr>
          <tr><th>AV Lejos</th><td>${opto.av_lejos_od1 || ''} - ${opto.av_lejos_od2 || ''} - ${opto.av_lejos_od3 || ''}</td></tr>
          <tr><th>AV Cerca</th><td>${opto.av_cerca_od1 || ''} - ${opto.av_cerca_od2 || ''}</td></tr>
          <tr><th>AV Con Lentes</th><td>${opto.av_lentes_od1 || ''} - ${opto.av_lentes_od2 || ''}</td></tr>

          <!-- 👁️ Ojo Izquierdo -->
          <tr><th colspan="2" class="table-secondary text-center">Ojo Izquierdo (OI)</th></tr>
          <tr><th>Esfera</th><td>${opto.esfera_oi || ''}</td></tr>
          <tr><th>Cilindro</th><td>${opto.cilindro_oi || ''}</td></tr>
          <tr><th>Eje</th><td>${opto.eje_oi || ''}</td></tr>
          <tr><th>AVcC</th><td>${opto.avcc_oi || ''}</td></tr>
          <tr><th>Adición</th><td>${opto.adicion_oi || ''}</td></tr>
          <tr><th>AVcC2</th><td>${opto.avcc2_oi || ''}</td></tr>
          <tr><th>AV Lejos</th><td>${opto.av_lejos_oi1 || ''} - ${opto.av_lejos_oi2 || ''} - ${opto.av_lejos_oi3 || ''}</td></tr>
          <tr><th>AV Cerca</th><td>${opto.av_cerca_oi1 || ''} - ${opto.av_cerca_oi2 || ''}</td></tr>
          <tr><th>AV Con Lentes</th><td>${opto.av_lentes_oi1 || ''} - ${opto.av_lentes_oi2 || ''}</td></tr>

          <!-- Otros datos -->
          <tr><th colspan="2" class="table-secondary text-center">Otros</th></tr>
          <tr><th>BMP</th><td>${opto.bmp || ''}</td></tr>
          <tr><th>BMP OD</th><td>${opto.bmp_od || ''}</td></tr>
          <tr><th>BMP OI</th><td>${opto.bmp_oi || ''}</td></tr>
          <tr><th>F.O</th><td>${opto.fo || ''}</td></tr>
          <tr><th>F.O OD</th><td>${opto.fo_od || ''}</td></tr>
          <tr><th>F.O OI</th><td>${opto.fo_oi || ''}</td></tr>
          <tr><th>Cicloplejia</th><td>${opto.cicloplejia || ''}</td></tr>
          <tr><th>Hora T.P.</th><td>${opto.hora_tp || ''}</td></tr>

          <!-- Fecha -->
          <tr><th>Fecha</th><td>${new Date(opto.fecha).toLocaleString()}</td></tr>
        </table>
        <hr/>
        `;
      });

      Swal.fire({
        title: `Optometría de ${nombre} (Expediente ${expedienteId})`,
        html: contenido,
        width: '70%',
        confirmButtonText: 'Cerrar'
      });
    } catch (error) {
      console.error("Error cargando optometría:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar las evaluaciones de optometría'
      });
    }
  }

  // === ELIMINAR EXPEDIENTE ===
  async function eliminarExpediente(id) {
    const confirmacion = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Esto eliminará el expediente permanentemente",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar'
    });

    if (confirmacion.isConfirmed) {
      try {
        const res = await fetch(`/api/expedientes/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (res.ok) {
          Swal.fire('Eliminado', data.mensaje, 'success');
          cargarExpedientes();
        } else {
          Swal.fire('Error', data.error || 'No se pudo eliminar', 'error');
        }
      } catch (error) {
        console.error("Error eliminando expediente:", error);
        Swal.fire('Error', 'Error de conexión al eliminar el expediente', 'error');
      }
    }
  }
}

// =========================== GESTION DE INSUMOS   ================================= //
if (window.location.pathname.includes("insumos.html")) {
  let fechaActual = new Date();

  document.addEventListener("DOMContentLoaded", () => {
    cargarInsumos();
    renderCalendar();
  });

  // Registrar insumo 
  if (elementoExiste("agendaForm")) {
    document.getElementById("agendaForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const datos = {
        fecha: document.getElementById("fechaInsumo")?.value || '',
        folio: document.getElementById("folio")?.value || '',
        concepto: document.getElementById("concepto")?.value || '',
        monto: document.getElementById("monto")?.value || ''
      };
      
      try {
        const res = await fetch("/api/insumos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos)
        });
        const data = await res.json();
        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: data.mensaje || "Insumo guardado correctamente",
            confirmButtonColor: '#27ae60'
          });
          cargarInsumos();
          renderCalendar();
          e.target.reset();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: data.error || "No se pudo guardar el insumo",
            confirmButtonColor: '#e74c3c'
          });
        }
      } catch (err) { 
        console.error(err); 
        Swal.fire({
          icon: 'error',
          title: 'Error inesperado',
          text: 'Ocurrió un problema al guardar el insumo',
          confirmButtonColor: '#e74c3c'
        });
      }
    });
  }

  // Subir Excel
  if (elementoExiste("uploadForm")) {
    document.getElementById("uploadForm").addEventListener("change", async (e) => {
      e.preventDefault();
      const formData = new FormData(document.getElementById("uploadForm"));
      try {
        const res = await fetch("/api/insumos/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: data.mensaje || "Archivo subido correctamente",
            confirmButtonColor: '#27ae60'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: data.error || "No se pudo subir el archivo",
            confirmButtonColor: '#e74c3c'
          });
        }

        cargarInsumos();
        renderCalendar();
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Error inesperado',
          text: 'Ocurrió un problema al subir el archivo',
          confirmButtonColor: '#e74c3c'
        });
      }
    });
  }

  // Listar insumos del mes actual
  async function cargarInsumos() {
    const tabla = document.getElementById("tablaInsumos");
    if (!tabla) return;
    
    try {
      const res = await fetch("/api/insumos");
      const insumos = await res.json();

      const year = fechaActual.getFullYear();
      const month = fechaActual.getMonth();

      const filtrados = insumos.filter(i => {
        const f = new Date(i.fecha);
        return f.getFullYear() === year && f.getMonth() === month;
      });

      tabla.innerHTML = "";
      filtrados.forEach(i => {
        tabla.innerHTML += `
          <tr>
            <td>${new Date(i.fecha).toLocaleDateString()}</td>
            <td>${i.folio}</td>
            <td>${i.concepto}</td>
            <td>$${parseFloat(i.monto).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${i.archivo ? `<a class="download-link" href="/uploads/${encodeURIComponent(i.archivo)}" download><i class="fas fa-download"></i> Descargar</a>` : "-"}</td>
            <td><button class="btn btn-delete" onclick="eliminarInsumo(${i.id})"><i class="fas fa-trash"></i></button></td>
          </tr>`;
      });
    } catch (err) { console.error(err); }
  }

  // Eliminar insumo 
  async function eliminarInsumo(id) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esta acción",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/insumos/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (res.ok) {
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: data.mensaje || "Insumo eliminado correctamente",
              confirmButtonColor: '#27ae60'
            });
            cargarInsumos();
            renderCalendar();
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: data.error || "No se pudo eliminar el insumo",
              confirmButtonColor: '#e74c3c'
            });
          }
        } catch (err) { 
          console.error(err); 
          Swal.fire({
            icon: 'error',
            title: 'Error inesperado',
            text: 'Ocurrió un problema al eliminar el insumo',
            confirmButtonColor: '#e74c3c'
          });
        }
      }
    });
  }

  // Calendario dinámico
  async function renderCalendar() {
    const calendario = document.getElementById("calendario");
    const mesActual = document.getElementById("mesActual");

    if (!calendario || !mesActual) return;

    const year = fechaActual.getFullYear();
    const month = fechaActual.getMonth();

    mesActual.textContent = fechaActual.toLocaleString("es-ES", { month: "long", year: "numeric" });

    const primerDia = new Date(year, month, 1).getDay() || 7;
    const diasEnMes = new Date(year, month + 1, 0).getDate();

    let insumos = [];
    try {
      const res = await fetch("/api/insumos");
      insumos = await res.json();
    } catch (err) { console.error(err); }

    const filtrados = insumos.filter(i => {
      const f = new Date(i.fecha);
      return f.getFullYear() === year && f.getMonth() === month;
    });

    calendario.innerHTML = "";

    ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].forEach(d => {
      calendario.innerHTML += `<div class="day-header">${d}</div>`;
    });

    for (let i = 1; i < primerDia; i++) {
      calendario.innerHTML += `<div class="empty-day"></div>`;
    }

    for (let d = 1; d <= diasEnMes; d++) {
      const fechaDia = new Date(year, month, d).toISOString().split("T")[0];
      const meds = filtrados.filter(i => i.fecha.startsWith(fechaDia));

      let contenido = `<div class="calendar-day"><div class="day-number">${d}</div>`;
      if (meds.length > 0) {
        meds.forEach(m => {
          contenido += `
            <div class="insumo-item">
              <div class="insumo-name">${m.concepto}</div>
              <div class="insumo-info">Folio: ${m.folio}</div>
              <div class="insumo-info">Monto: $${parseFloat(m.monto).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>`;
        });
      }
      contenido += "</div>";
      calendario.innerHTML += contenido;
    }
  }

  function cambiarMes(offset) {
    fechaActual.setMonth(fechaActual.getMonth() + offset);
    cargarInsumos();
    renderCalendar();
  }
}

// =========================== GESTION DE MEDICO  ================================= //
if (window.location.pathname.includes("medico.html")) {
  async function cargarPacientes() {
    try {
      const res = await fetch('/api/pendientes-medico');
      const data = await res.json();
      const tbody = document.getElementById('lista-medica');
      if (!tbody) return;
      
      tbody.innerHTML = '';

      data.forEach(exp => {
        let clase = "";
        if (exp.procedimiento === "Consulta") clase = "table-consulta";
        else if (exp.procedimiento === "Estudio") clase = "table-estudio";
        else if (exp.procedimiento === "Cirugía") clase = "table-cirugia";

        tbody.innerHTML += `
          <tr class="${clase}">
            <td>${exp.expediente_id}</td>
            <td>${exp.nombre_completo}</td>
            <td>${exp.edad}</td>
            <td>${exp.padecimientos}</td>
            <td><span class="badge bg-primary">${exp.procedimiento}</span></td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="abrirOrden(${exp.expediente_id}, ${exp.recibo_id})">
                <i class="fas fa-stethoscope"></i> Atención Médica
              </button>
            </td>
          </tr>`;
      });
    } catch (err) {
      console.error("Error cargando pacientes:", err);
      mostrarError("Error", "No se pudieron cargar los pacientes pendientes");
    }
  }

  async function cargarProcedimientos() {
    try {
      const res = await fetch('/api/procedimientos');
      const data = await res.json();
      const select = document.getElementById('procedimiento_id');
      if (!select) return;
      
      select.innerHTML = '';
      data.forEach(proc => {
        select.innerHTML += `<option value="${proc.id}">${proc.nombre} — $${proc.precio}</option>`;
      });
    } catch (err) {
      console.error("Error cargando procedimientos:", err);
      mostrarError("Error", "No se pudieron cargar los procedimientos");
    }
  }

  function abrirOrden(expediente_id, recibo_id) {
    const formOrden = document.getElementById('form-orden');
    if (!formOrden) return;
    
    formOrden.reset();
    document.querySelectorAll('input[name="problemas"]').forEach(cb => cb.checked = false);

    const expedienteInput = document.getElementById('expediente_id');
    const folioRecibo = document.getElementById('folio_recibo');
    
    if (expedienteInput) expedienteInput.value = expediente_id;
    if (folioRecibo) folioRecibo.value = recibo_id;

    cargarProcedimientos();
    
    const modalElement = document.getElementById('modalOrden');
    if (modalElement) {
      new bootstrap.Modal(modalElement).show();
    }
  }

  if (elementoExiste("form-orden")) {
    document.getElementById('form-orden').addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const problemasSeleccionados = Array.from(
          document.querySelectorAll('input[name="problemas"]:checked')
        ).map(cb => cb.value).join(", ");

        const data = {
          folio_recibo: document.getElementById('folio_recibo')?.value || '',
          medico: document.getElementById('medico')?.value || '',
          diagnostico: document.getElementById('diagnostico')?.value || '',
          lado: document.getElementById('lado')?.value || '',
          procedimiento_id: document.getElementById('procedimiento_id')?.value || '',
          anexos: document.getElementById('anexos')?.value || '',
          conjuntiva: document.getElementById('conjuntiva')?.value || '',
          cornea: document.getElementById('cornea')?.value || '',
          camara_anterior: document.getElementById('camara_anterior')?.value || '',
          cristalino: document.getElementById('cristalino')?.value || '',
          retina: document.getElementById('retina')?.value || '',
          macula: document.getElementById('macula')?.value || '',
          nervio_optico: document.getElementById('nervio_optico')?.value || '',
          problemas: problemasSeleccionados,
          plan: document.getElementById('plan')?.value || ''
        };

        const res = await fetch('/api/ordenes_medicas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await res.json();

        if (res.ok) {
          mostrarExito("¡Éxito!", json.mensaje || 'Orden médica guardada correctamente');

          const formOrden = document.getElementById("form-orden");
          if (formOrden) {
            formOrden.reset();
            document.querySelectorAll('input[name="problemas"]').forEach(cb => cb.checked = false);
          }

          const modalElement = document.getElementById('modalOrden');
          if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
          }
          
          cargarPacientes();
        } else {
          mostrarError("Error", json.error || 'No se pudo guardar la orden médica');
        }
      } catch (err) {
        console.error("Error guardando orden:", err);
        mostrarError("Error", "Ocurrió un problema al guardar la orden médica");
      }
    });
  }

  // Cargar pacientes al inicio
  document.addEventListener("DOMContentLoaded", function() {
    cargarPacientes();
  });
}

// =========================== GESTION DE OPTOMETRIA ================================= //
if (window.location.pathname.includes("optometria.html")) {
  // Cargar y mostrar las evaluaciones de optometría
  async function cargarOptometrias() {
    const filtro = document.getElementById("filtroOpto")?.value || "todos";
    const res = await fetch(`/api/optometria?filtro=${filtro}`);

    const data = await res.json();
    const tablaOpto = document.getElementById("tablaOpto");
    if (!tablaOpto) return;
    
    let html = `
      <div class="card">
        <div class="card-header"><i class="fas fa-list"></i> Registros de Optometría</div>
        <div class="card-body table-responsive">
          <table class="table text-center align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Expediente</th>
                <th>Nombre</th>
                <th>OD Esfera</th>
                <th>OD Cilindro</th>
                <th>OD Eje</th>
                <th>OD AVcC</th>
                <th>OD Adición</th>
                <th>OD AVcC2</th>
                <th>OI Esfera</th>
                <th>OI Cilindro</th>
                <th>OI Eje</th>
                <th>OI AVcC</th>
                <th>OI Adición</th>
                <th>OI AVcC2</th>
                <th>BMP</th>
                <th>BMP OD</th>
                <th>BMP OI</th>
                <th>F.O</th>
                <th>F.O OD</th>
                <th>F.O OI</th>
                <th>OD AV Lejos</th>
                <th>OD AV Cerca</th>
                <th>OD Con Lentes</th>
                <th>OI AV Lejos</th>
                <th>OI AV Cerca</th>
                <th>OI Con Lentes</th>
                <th>Cicloplejia</th>
                <th>Hora T.P.</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
    `;
    data.forEach(o => {
      html += `
        <tr>
          <td>${o.id}</td>
          <td>${o.expediente_id}</td>
          <td>${o.nombre}</td>
          <td>${o.esfera_od || ""}</td>
          <td>${o.cilindro_od || ""}</td>
          <td>${o.eje_od || ""}</td>
          <td>${o.avcc_od || ""}</td>
          <td>${o.adicion_od || ""}</td>
          <td>${o.avcc2_od || ""}</td>
          <td>${o.esfera_oi || ""}</td>
          <td>${o.cilindro_oi || ""}</td>
          <td>${o.eje_oi || ""}</td>
          <td>${o.avcc_oi || ""}</td>
          <td>${o.adicion_oi || ""}</td>
          <td>${o.avcc2_oi || ""}</td>
          <td>${o.bmp || ""}</td>
          <td>${o.bmp_od || ""}</td>
          <td>${o.bmp_oi || ""}</td>
          <td>${o.fo || ""}</td>
          <td>${o.fo_od || ""}</td>
          <td>${o.fo_oi || ""}</td>
          <td>
            ${(o.av_lejos_od1 || "")}<br>
            ${(o.av_lejos_od2 || "")}<br>
            ${(o.av_lejos_od3 || "")}
          </td>
          <td>
            ${(o.av_cerca_od1 || "")}<br>
            ${(o.av_cerca_od2 || "")}
          </td>
          <td>
            ${(o.av_lentes_od1 || "")}<br>
            ${(o.av_lentes_od2 || "")}
          </td>
          <td>
            ${(o.av_lejos_oi1 || "")}<br>
            ${(o.av_lejos_oi2 || "")}<br>
            ${(o.av_lejos_oi3 || "")}
          </td>
          <td>
            ${(o.av_cerca_oi1 || "")}<br>
            ${(o.av_cerca_oi2 || "")}
          </td>
          <td>
            ${(o.av_lentes_oi1 || "")}<br>
            ${(o.av_lentes_oi2 || "")}
          </td>
          <td>${o.cicloplejia || ""}</td>
          <td>${o.hora_tp || ""}</td>
          <td>${new Date(o.fecha).toLocaleString()}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="borrarOpto(${o.id})">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
    html += `</tbody></table></div></div>`;
    tablaOpto.innerHTML = html;
  }

  if (elementoExiste("btnNuevo")) {
    document.getElementById("btnNuevo").addEventListener("click", () => {
      const formularioOpto = document.getElementById("formularioOpto");
      const tablaOpto = document.getElementById("tablaOpto");
      
      if (formularioOpto) formularioOpto.style.display = "block";
      if (tablaOpto) tablaOpto.style.display = "none";
      
      if (formularioOpto) {
        formularioOpto.innerHTML = `
<div class="card">
  <div class="card-header custom-header text-white"><i class="fas fa-plus-circle"></i> Nueva Evaluación</div>
  <div class="card-body">
    <form id="formOptometria">
      <div class="mb-3">
        <label class="form-label">Número de Expediente</label>
        <input type="number" id="expedienteInput" name="expediente_id" class="form-control" required>
      </div>

      <div class="mb-3">
        <label class="form-label">Nombre del Paciente</label>
        <input type="text" id="nombrePaciente" class="form-control" readonly>
      </div>

      <div class="table-responsive">
        <table class="table table-bordered text-center align-middle">
          <thead class="table-light">
            <tr>
              <th rowspan="2">SUBJETIVA</th>
              <th>Esferas</th>
              <th>Cilindros</th>
              <th>Eje</th>
              <th>AV cC</th>
              <th>Adición</th>
              <th>AV cC2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>OD</strong></td>
              <td><input type="text" name="esfera_od" class="form-control"></td>
              <td><input type="text" name="cilindro_od" class="form-control"></td>
              <td><input type="text" name="eje_od" class="form-control"></td>
              <td><input type="text" name="avcc_od" class="form-control"></td>
              <td><input type="text" name="adicion_od" class="form-control"></td>
              <td><input type="text" name="avcc2_od" class="form-control"></td>
            </tr>
            <tr>
              <td><strong>OI</strong></td>
              <td><input type="text" name="esfera_oi" class="form-control"></td>
              <td><input type="text" name="cilindro_oi" class="form-control"></td>
              <td><input type="text" name="eje_oi" class="form-control"></td>
              <td><input type="text" name="avcc_oi" class="form-control"></td>
              <td><input type="text" name="adicion_oi" class="form-control"></td>
              <td><input type="text" name="avcc2_oi" class="form-control"></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="row mt-4">
        <div class="col-md-2"><label class="form-label">BMP</label><input type="text" name="bmp" class="form-control"></div>
        <div class="col-md-2"><label class="form-label">BMP OD</label><input type="text" name="bmp_od" class="form-control"></div>
        <div class="col-md-2"><label class="form-label">BMP OI</label><input type="text" name="bmp_oi" class="form-control"></div>
        <div class="col-md-2"><label class="form-label">F.O</label><input type="text" name="fo" class="form-control"></div>
        <div class="col-md-2"><label class="form-label">F.O OD</label><input type="text" name="fo_od" class="form-control"></div>
        <div class="col-md-2"><label class="form-label">F.O OI</label><input type="text" name="fo_oi" class="form-control"></div>
      </div>

      <div class="row mt-4">
        <div class="col-md-6">
          <label class="form-label">Cicloplejia</label>
          <input type="text" name="cicloplejia" class="form-control">
        </div>
        <div class="col-md-6">
          <label class="form-label">Hora T.P.</label>
          <input type="time" name="hora_tp" class="form-control">
        </div>
      </div>

      <div class="table-responsive mt-4">
        <table class="table table-bordered text-center align-middle">
          <thead class="table-light">
            <tr>
              <th></th>
              <th colspan="3">AV Lejos</th>
              <th colspan="2">AV Cerca</th>
              <th colspan="2">Con Lentes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>OD</strong></td>
              <td><input type="text" name="av_lejos_od1" class="form-control"></td>
              <td><input type="text" name="av_lejos_od2" class="form-control"></td>
              <td><input type="text" name="av_lejos_od3" class="form-control"></td>
              <td><input type="text" name="av_cerca_od1" class="form-control"></td>
              <td><input type="text" name="av_cerca_od2" class="form-control"></td>
              <td><input type="text" name="av_lentes_od1" class="form-control"></td>
              <td><input type="text" name="av_lentes_od2" class="form-control"></td>
            </tr>
            <tr>
              <td><strong>OI</strong></td>
              <td><input type="text" name="av_lejos_oi1" class="form-control"></td>
              <td><input type="text" name="av_lejos_oi2" class="form-control"></td>
              <td><input type="text" name="av_lejos_oi3" class="form-control"></td>
              <td><input type="text" name="av_cerca_oi1" class="form-control"></td>
              <td><input type="text" name="av_cerca_oi2" class="form-control"></td>
              <td><input type="text" name="av_lentes_oi1" class="form-control"></td>
              <td><input type="text" name="av_lentes_oi2" class="form-control"></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="d-flex justify-content-end mt-4">
        <button type="button" class="btn btn-secondary me-2" onclick="cancelarFormulario()">
          <i class="fas fa-times"></i> Cancelar
        </button>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> Guardar Evaluación
        </button>
      </div>
    </form>
  </div>
</div>
        `;

        const formOptometria = document.getElementById("formOptometria");
        if (formOptometria) {
          formOptometria.addEventListener("submit", guardarOpto);
        }
      }
    });
  }

  function cancelarFormulario() {
    const formularioOpto = document.getElementById("formularioOpto");
    const tablaOpto = document.getElementById("tablaOpto");
    
    if (formularioOpto) formularioOpto.style.display = "none";
    if (tablaOpto) tablaOpto.style.display = "block";
  }
}
    // Guardar nueva evaluación
    async function guardarOpto(e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      const res = await fetch("/api/optometria", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
      });
      const json = await res.json();

      if (res.ok) {
        mostrarExito("Evaluación guardada", json.mensaje || 'Evaluación registrada correctamente');
      } else {
        mostrarError("Error al guardar", json.error || 'No se pudo guardar la evaluación');
      }

      cancelarFormulario();
      cargarOptometrias();
    }

    async function borrarOpto(id) {
      const confirmacion = await Swal.fire({
        icon: 'warning',
        title: '¿Eliminar este registro?',
        text: 'Esta acción no se puede deshacer',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e74c3c'
      });

      if (!confirmacion.isConfirmed) return;

      const res = await fetch(`/api/optometria/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (res.ok) {
        mostrarExito("Registro eliminado", json.mensaje || 'Registro eliminado correctamente');
      } else {
        mostrarError("Error al eliminar", json.error || 'No se pudo eliminar el registro');
      }

      cargarOptometrias();
    }

    document.getElementById("buscarOpto").addEventListener("input", (e) => {
      const f = e.target.value.toLowerCase();
      document.querySelectorAll("#tablaOpto tbody tr").forEach(row => {
        const expediente = row.cells[1]?.innerText.toLowerCase();
        const nombre = row.cells[2]?.innerText.toLowerCase();
        row.style.display = (expediente.includes(f) || nombre.includes(f)) ? "" : "none";
      });
    });

    // Mostrar mensaje de éxito
    function mostrarExito(titulo, mensaje) {
      document.getElementById('successMessage').textContent = mensaje;
      document.getElementById('successAlert').style.display = 'block';
      
      // Ocultar después de 5 segundos
      setTimeout(() => {
        document.getElementById('successAlert').style.display = 'none';
      }, 5000);
      
      Swal.fire({
        icon: 'success',
        title: titulo,
        text: mensaje,
        timer: 3000,
        showConfirmButton: false
      });
    }

    // Mostrar error
    function mostrarError(titulo, mensaje) {
      Swal.fire({
        icon: 'error',
        title: titulo,
        text: mensaje
      });
    }
    // Buscar nombre de paciente al escribir expediente
document.addEventListener("input", async (e) => {
  if (e.target.id === "expedienteInput") {
    const id = e.target.value.trim();
    if (!id) {
      document.getElementById("nombrePaciente").value = "";
      return;
    }
    try {
      const res = await fetch(`/api/expedientes/${id}/nombre`);
      if (res.ok) {
        const data = await res.json();
        document.getElementById("nombrePaciente").value = data.nombre;
      } else {
        document.getElementById("nombrePaciente").value = "No encontrado";
      }
    } catch (err) {
      console.error("Error buscando expediente:", err);
      document.getElementById("nombrePaciente").value = "Error";
    }
  }
});

    // Cargar evaluaciones al iniciar
    document.addEventListener("DOMContentLoaded", function() {
    // Filtro dinámico
    document.getElementById("filtroOpto").addEventListener("change", cargarOptometrias);

      cargarOptometrias();
    });
  
//============================ GESTION DE ORDENES================================= //
if (window.location.pathname.includes("ordenes.html")) {
}
    let ordenesData = [];

    // Datos de ejemplo basados en tu imagen
    const datosEjemplo = [
      {
        numero: 3,
        paciente: "Ana Sofía Hernández López",
        medico: "Jose Manuel L.",
        diagnostico: "mckd",
        lado: "OD",
        procedimiento: "Cirugía de Catarata",
        tipo: "Normal",
        precio: 8000.00,
        pagado: 300.00,
        pendiente: 7700.00,
        estatus: "Pendiente",
        fecha: "2025-09-22",
        orden_id: 3
      }
    ];

    async function cargarOrdenes() {
      try {
        // Intenta cargar datos desde la API
        const res = await fetch("/api/ordenes_medicas");
        if (res.ok) {
          ordenesData = await res.json();
        } else {
          // Si falla la API, usa datos de ejemplo
          ordenesData = datosEjemplo;
        }
        
        document.getElementById("tablaOrdenes").innerHTML = ordenesData.map((o, i) => `
          <tr>
            <td>${o.numero || o.expediente_numero || ''}</td>
            <td class="text-truncate-cell" title="${o.paciente}">${o.paciente}</td>
            <td class="text-truncate-cell" title="${o.medico}">${o.medico}</td>
            <td class="text-truncate-cell" title="${o.diagnostico}">${o.diagnostico}</td>
            <td>${o.lado}</td>
            <td class="text-truncate-cell" title="${o.procedimiento}">${o.procedimiento}</td>
            <td><span class="badge bg-info">${o.tipo}</span></td>
            <td>$${parseFloat(o.precio).toFixed(2)}</td>
            <td>$${parseFloat(o.pagado).toFixed(2)}</td>
            <td>$${parseFloat(o.pendiente).toFixed(2)}</td>
            <td>
              ${o.estatus === "Pagado"
                ? `<span class="badge bg-success">Pagado</span>`
                : `<span class="badge bg-warning">${o.estatus}</span>`}
            </td>
            <td>${new Date(o.fecha).toLocaleDateString("es-MX")}</td>
            <td>
              ${o.estatus === "Pagado"
                ? `<button class="btn btn-secondary btn-sm" disabled>
                     <i class="fas fa-check"></i> Pagado
                   </button>`
                : `<button class="btn btn-success btn-sm" onclick="abrirPago(${i})">
                    <i class="fas fa-dollar-sign"></i> Pagar
                  </button>`}

            </td>
          </tr>`).join("");
      } catch (err) { 
        console.error("Error cargando órdenes:", err);
        // En caso de error, usa datos de ejemplo
        ordenesData = datosEjemplo;
        document.getElementById("tablaOrdenes").innerHTML = ordenesData.map((o, i) => `
          <tr>
            <td>${o.numero || o.expediente_numero || ''}</td>
            <td class="text-truncate-cell" title="${o.paciente}">${o.paciente}</td>
            <td class="text-truncate-cell" title="${o.medico}">${o.medico}</td>
            <td class="text-truncate-cell" title="${o.diagnostico}">${o.diagnostico}</td>
            <td>${o.lado}</td>
            <td class="text-truncate-cell" title="${o.procedimiento}">${o.procedimiento}</td>
            <td><span class="badge bg-info">${o.tipo}</span></td>
            <td>$${parseFloat(o.precio).toFixed(2)}</td>
            <td>$${parseFloat(o.pagado).toFixed(2)}</td>
            <td>$${parseFloat(o.pendiente).toFixed(2)}</td>
            <td>
              ${o.estatus === "Pagado"
                ? `<span class="badge bg-success">Pagado</span>`
                : `<span class="badge bg-warning">${o.estatus}</span>`}
            </td>
            <td>${new Date(o.fecha).toLocaleDateString("es-MX")}</td>
                  <td class="d-flex justify-content-center">
        ${o.estatus === "Pagado"
          ? `<button class="btn btn-secondary btn-sm" disabled>
              <i class="fas fa-check"></i> Pagado
            </button>`
          : `<button class="btn btn-success btn-sm" onclick="abrirPago(${i})">
              <i class="fas fa-dollar-sign"></i> Pagar
            </button>`}
      </td>

          </tr>`).join("");
      }
    }

    function abrirPago(index) {
      const o = ordenesData[index];
      document.getElementById("formPago").reset();
      document.getElementById("orden_id").value = o.orden_id;
      document.getElementById("pacientePago").textContent = o.paciente;
      document.getElementById("procedimientoPago").textContent = o.procedimiento;
      document.getElementById("precioPago").textContent = parseFloat(o.precio).toFixed(2);
      document.getElementById("pagadoPago").textContent = parseFloat(o.pagado).toFixed(2);
      document.getElementById("pendientePago").textContent = parseFloat(o.pendiente).toFixed(2);
      document.getElementById("montoLiquidar").setAttribute("max", o.pendiente);
      document.getElementById("montoLiquidar").value = "";
      
      new bootstrap.Modal(document.getElementById("modalPago")).show();
    }

    document.getElementById("formPago").addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const ordenId = document.getElementById("orden_id").value;
      const monto = parseFloat(document.getElementById("montoLiquidar").value);
      const pendiente = parseFloat(document.getElementById("pendientePago").textContent);
      
      if (monto > pendiente) {
        mostrarError("Error", "El monto no puede ser mayor al pendiente");
        return;
      }
      
      if (monto <= 0) {
        mostrarError("Error", "El monto debe ser mayor a cero");
        return;
      }

      const data = {
        orden_id: ordenId,
        monto: monto,
        forma_pago: document.getElementById("formaPago").value
      };

      Swal.fire({
        title: 'Procesando...',
        text: 'Registrando el pago, por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const res = await fetch("/api/pagos", {
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify(data)
        });
        
        if (res.ok) {
          mostrarExito("¡Éxito!", "Pago registrado con éxito");
          
          document.getElementById("formPago").reset();
          bootstrap.Modal.getInstance(document.getElementById("modalPago")).hide();
          cargarOrdenes();
        } else {
          const errorData = await res.json();
          mostrarError("Error", errorData.error || 'No se pudo registrar el pago');
        }
      } catch (err) {
        console.error("Error al registrar pago:", err);
        mostrarError("Error", "Error de conexión al registrar el pago");
      }
    });

    // Mostrar mensaje de éxito
    function mostrarExito(titulo, mensaje) {
      document.getElementById('successMessage').textContent = mensaje;
      document.getElementById('successAlert').style.display = 'block';
      
      setTimeout(() => {
        document.getElementById('successAlert').style.display = 'none';
      }, 5000);
      
      Swal.fire({
        icon: 'success',
        title: titulo,
        text: mensaje,
        timer: 3000,
        showConfirmButton: false
      });
    }

    // Mostrar error
    function mostrarError(titulo, mensaje) {
      Swal.fire({
        icon: 'error',
        title: titulo,
        text: mensaje
      });
    }

    // Cargar órdenes al inicio
    document.addEventListener("DOMContentLoaded", function() {
      cargarOrdenes();
    });

// =========================== GESTION DE RECIBO  ================================= //
if (window.location.pathname.includes("recibos.html")) {
}
    let userRole = localStorage.getItem("rol") || "usuario"; 
    let pacienteId = null;
    let catalogo = [];

    // Cargar catálogo de procedimientos
    async function cargarCatalogo() {
      try {
        const res = await fetch("/api/procedimientos");
        catalogo = await res.json();

        // Rellenar el select de procedimiento con los valores de la BD
        const procSelect = document.getElementById("procedimiento");
        procSelect.innerHTML = catalogo.map(c =>
          `<option value="${c.nombre}">${c.nombre}</option>`
        ).join("");

        actualizarPrecios();
      } catch (err) {
        console.error("Error cargando catálogo:", err);
      }
    }

    // Actualizar opciones de precios según el procedimiento elegido
    function actualizarPrecios() {
      const proc = document.getElementById("procedimiento").value;
      const select = document.getElementById("precio");
      const elegido = catalogo.find(c => c.nombre === proc);
      select.innerHTML = elegido 
        ? `<option value="${elegido.precio}">${elegido.nombre} — $${elegido.precio}</option>`
        : "";
    }

    // Escuchar cambio de procedimiento
    document.getElementById("procedimiento").addEventListener("change", actualizarPrecios);

    cargarCatalogo();

    // Autocompletar paciente por folio
    document.getElementById("folio").addEventListener("input", async () => {
      const folio = document.getElementById("folio").value;
      if (!folio) {
        document.getElementById("nombrePaciente").value = "";
        pacienteId = null;
        return;
      }
      try {
        const res = await fetch(`/api/recibos/paciente/${folio}`);
        if (!res.ok) {
          document.getElementById("nombrePaciente").value = "No encontrado";
          pacienteId = null;
          return;
        }
        const data = await res.json();
        document.getElementById("nombrePaciente").value = data.nombre_completo;
        pacienteId = data.id;
      } catch (err) {
        console.error("Error buscando paciente:", err);
      }
    });

    // Guardar recibo
    document.getElementById("formRecibo").addEventListener("submit", async function(e) {
      e.preventDefault();
      if (!pacienteId) {
        mostrarError("Atención", "Debes ingresar un número de expediente válido");
        return;
      }

      const datos = {
        fecha: this.fecha.value,
        paciente_id: pacienteId,
        procedimiento: this.procedimiento.value,
        precio: this.precio.value,
        forma_pago: this.forma_pago.value,
        monto_pagado: this.monto_pagado.value,
        tipo: this.tipoRecibo.value
      };

      try {
        const res = await fetch('/api/recibos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datos)
        });
        const data = await res.json();

        if (res.ok) {
          mostrarExito("¡Éxito!", "Recibo guardado correctamente");
          this.reset();
          document.getElementById("nombrePaciente").value = "";

          // Volver a poner fecha actual
          const hoy = new Date();
          const yyyy = hoy.getFullYear();
          const mm = String(hoy.getMonth() + 1).padStart(2, '0');
          const dd = String(hoy.getDate()).padStart(2, '0');
          document.getElementById("fecha").value = `${yyyy}-${mm}-${dd}`;

          cargarRecibos();
          actualizarPrecios();
        } else {
          mostrarError("Error", data.error || 'No se pudo guardar el recibo');
        }
      } catch (err) {
        console.error("Error guardando recibo:", err);
        mostrarError("Error", "No se pudo guardar el recibo");
      }
    });

    // Eliminar recibo
    async function eliminarRecibo(id) {
      const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        text: "No podrás revertir esta acción",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });

      if (!confirmacion.isConfirmed) return;

      try {
        const res = await fetch(`/api/recibos/${id}`, { method: "DELETE" });
        const data = await res.json();
        
        if (res.ok) {
          mostrarExito("Eliminado", "El recibo fue eliminado correctamente");
          cargarRecibos();
        } else {
          mostrarError("Error", data.error || 'No se pudo eliminar el recibo');
        }
      } catch (err) {
        console.error("Error al eliminar recibo:", err);
        mostrarError("Error", "Ocurrió un error eliminando el recibo");
      }
    }

    // Generar vista previa del recibo y confirmar impresión
    async function imprimirRecibo(id) {
      try {
        const res = await fetch(`/api/recibos/${id}`);
        if (!res.ok) {
          mostrarError("Error", "No se encontró el recibo");
          return;
        }
        const recibo = await res.json();

        // Plantilla formal de recibo
        const contenido = `
          <div class="recibo-preview">
            <div class="recibo-header">
              <img src="/uploads/logo-oftavision.png" alt="Logo" class="recibo-logo">
              <h2 style="margin:5px 0;">CLÍNICA OFTAVISION</h2>
              <h4 style="margin:0; color:#444;">RECIBO DE PAGO</h4>
              <hr>
            </div>

            <div class="recibo-details">
              <table style="width:100%; margin-bottom:15px; font-size:14px;">
                <tr>
                  <td><b>Fecha:</b> ${new Date(recibo.fecha).toISOString().split("T")[0].split("-").reverse().join("/")}</td>
                  <td style="text-align:right;"><b>Recibo N°:</b> ${recibo.id}</td>
                </tr>
                <tr>
                  <td><b>Folio Expediente:</b> ${recibo.folio}</td>
                  <td style="text-align:right;"><b>Tipo:</b> ${recibo.tipo}</td>
                </tr>
                <tr>
                  <td colspan="2"><b>Paciente:</b> ${recibo.paciente}</td>
                </tr>
                <tr>
                  <td colspan="2"><b>Forma de Pago:</b> ${recibo.forma_pago}</td>
                </tr>
              </table>
            </div>

            <table class="recibo-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Precio</th>
                  <th>Pagado</th>
                  <th>Pendiente</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${recibo.procedimiento}</td>
                  <td style="text-align:right;">$${parseFloat(recibo.precio).toFixed(2)}</td>
                  <td style="text-align:right;">$${parseFloat(recibo.monto_pagado).toFixed(2)}</td>
                  <td style="text-align:right;">$${parseFloat(recibo.pendiente).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div class="recibo-footer">
              <p><b>CLÍNICA OFTAVISION</b> - Este recibo no es un comprobante fiscal.</p>
            </div>
          </div>
        `;

        // Mostrar modal de confirmación con el recibo
        Swal.fire({
          title: 'Vista previa del recibo',
          html: contenido,
          width: 800,
          showCancelButton: true,
          confirmButtonText: 'Descargar',
          cancelButtonText: 'Cancelar',
          customClass: {
            popup: 'swal-wide'
          },
          preConfirm: () => {
            // Generar el PDF solo si el usuario confirma
            const opt = {
              margin: 10,
              filename: `recibo_${recibo.id}.pdf`,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2 },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().from(contenido).set(opt).save();
          }
        });

      } catch (err) {
        console.error("Error imprimiendo recibo:", err);
        mostrarError("Error", "No se pudo generar el PDF");
      }
    }

    // Cargar lista de recibos
    async function cargarRecibos() {
      try {
        const res = await fetch('/api/recibos');
        const recibos = await res.json();
        document.getElementById("tablaRecibos").innerHTML = recibos.map(r => `
          <tr>
            <td>${r.fecha}</td>
            <td>${r.folio}</td>
            <td>${r.paciente}</td>
            <td>${r.procedimiento}</td>
            <td><span class="badge bg-info">${r.tipo}</span></td>
            <td>${r.forma_pago}</td>
            <td><span class="badge bg-info">$${parseFloat(r.monto_pagado).toFixed(2)}</span></td>
            <td><span class="badge bg-success">$${parseFloat(r.precio).toFixed(2)}</span></td>
           <td>
              <span class="badge bg-warning abonar-btn"
                    style="cursor:pointer;"
                    data-id="${r.id}"
                    data-pendiente="${r.precio - r.monto_pagado}">
                $${parseFloat(r.precio - r.monto_pagado).toFixed(2)}
              </span>
            </td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="imprimirRecibo(${r.id})">
                <i class="fas fa-receipt"></i> Comprobante

              </button>
              
              ${userRole === "admin" ? `
                <button class="btn btn-danger btn-sm" onclick="eliminarRecibo(${r.id})">
                  <i class="fas fa-trash"></i> Eliminar
                </button>` : ""}
            </td>
          </tr>
        `).join('');
      } catch (err) {
        console.error("Error cargando recibos:", err);
        mostrarError("Error", "No se pudieron cargar los recibos");
      }
    }

    // Mostrar mensaje de éxito
    function mostrarExito(titulo, mensaje) {
      document.getElementById('successMessage').textContent = mensaje;
      document.getElementById('successAlert').style.display = 'block';
      
      // Ocultar después de 5 segundos
      setTimeout(() => {
        document.getElementById('successAlert').style.display = 'none';
      }, 5000);
      
      Swal.fire({
        icon: 'success',
        title: titulo,
        text: mensaje,
        timer: 3000,
        showConfirmButton: false
      });
    }

    // Mostrar error
    function mostrarError(titulo, mensaje) {
      Swal.fire({
        icon: 'error',
        title: titulo,
        text: mensaje
      });
    }

    // Delegación de eventos: clic en el pendiente para abonar
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("abonar-btn")) {
    const reciboId = e.target.dataset.id;
    const pendiente = e.target.dataset.pendiente;
// Mostrar modal para ingresar monto a abonar
    const { value: formValues } = await 
   
   Swal.fire({
  title: '<i class="fas fa-cash-register text-primary"></i> Abonar a Recibo',
  html: `
    <div style="text-align:center; margin-bottom:20px;">
      <span style="font-size:1.1rem; color:#2c3e50;">Pendiente actual:</span><br>
      <b style="color:#e74c3c; font-size:1.5rem;">$${parseFloat(pendiente).toFixed(2)}</b>
    </div>

    <div class="form-group" style="margin-bottom:15px; text-align:left;">
      <label style="font-weight:600; color:#34495e;">Monto a abonar</label>
      <input id="monto" class="swal2-input" type="number" min="1" placeholder="Ingrese monto" style="margin-top:5px;">
    </div>

    <div class="form-group" style="text-align:left;">
      <label style="font-weight:600; color:#34495e;">Forma de Pago</label>
      <select id="formaPago" class="form-select" style="width:100%;">
        <option value="Efectivo">Efectivo</option>
        <option value="Tarjeta Débito">Tarjeta Débito</option>
        <option value="Tarjeta Crédito">Tarjeta Crédito</option>
        <option value="Transferencia">Transferencia</option>
      </select>

    </div>
  `,
  confirmButtonText: '<i class="fas fa-save"></i> Registrar Abono',
  confirmButtonColor: '#27ae60',
  cancelButtonText: 'Cancelar',
  showCancelButton: true,
  cancelButtonColor: '#7f8c8d',
  background: '#fdfdfd',
  width: 500,
  customClass: {
    popup: 'swal2-shadow'
  },
  preConfirm: () => {
    return {
      monto: document.getElementById('monto').value,
      forma_pago: document.getElementById('formaPago').value
    }
  }
});

    // Si el usuario canceló
    if (!formValues) return;

    try {
      const res = await fetch(`/api/recibos/${reciboId}/abonos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues)
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire('✅ Éxito', 'Abono registrado correctamente', 'success');
        cargarRecibos(); // recargar lista
      } else {
        Swal.fire('❌ Error', data.error || 'No se pudo registrar el abono', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('❌ Error', 'Ocurrió un error en el servidor', 'error');
    }
  }
});

    // Poner fecha actual automáticamente en el formulario
    document.addEventListener("DOMContentLoaded", () => {
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, '0');
      const dd = String(hoy.getDate()).padStart(2, '0');
      document.getElementById("fecha").value = `${yyyy}-${mm}-${dd}`;
      
      cargarRecibos();
    });

//============================ GESTION DE RESET-PASSWORD =============================//
if (window.location.pathname.includes("reset-password.html")) {
  document.getElementById('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Obtener token de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const password = document.getElementById('newPassword').value;

    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });

    const data = await res.json();
    alert(data.mensaje || data.error);
    if (res.ok) window.location.href = '/login/login.html';
  });
}

