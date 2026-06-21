import React, { useState } from 'react';



const Register = ({ onRegister, onToggle, showToast }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    orgName: '',
    staffCode: '',
    role: 'admin' // defaults to admin
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (role) => {
    setFormData((prev) => ({ 
      ...prev, 
      role,
      // Clear fields specific to other roles
      orgName: role === 'admin' ? prev.orgName : '',
      staffCode: role === 'staff' ? prev.staffCode : ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { username, password, name, email, phone, address, orgName, staffCode, role } = formData;
    
    if (!username.trim() || !password.trim() || !name.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      showToast('All standard profile fields are required.', 'error');
      return;
    }

    if (role === 'admin' && !orgName.trim()) {
      showToast('Organization/School/College name is required for Admin.', 'error');
      return;
    }

    if (role === 'staff' && !staffCode.trim()) {
      showToast('Admin unique registration code is required for Staff.', 'error');
      return;
    }

    onRegister(formData);
  };

  return (
    <div className="w-full text-left">
        <div className="flex items-center justify-around mb-2 rounded-full p-2 bg-gray-50">
  <h2 className="flex-1 text-center bg-red-600 text-white py-2 rounded-full font-bold text-xl">
    Register
  </h2>

  <button
    onClick={onToggle}
    className="flex-1 text-center text-xl text-gray-800 font-bold bg-transparent border-none cursor-pointer"
  >
    Login
  </button>
</div>
      {/* <p className="text-xs text-gray-500 mb-5">Fill in the details below to register on the exam allotment portal.</p> */}
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Role Radio buttons */}
        <div className="relative flex bg-gray-100 rounded-lg p-1 w-full">
  {/* Sliding Background */}
  <div
    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md bg-red-500 transition-all duration-700 ease-in-out
      ${formData.role === 'admin' ? 'left-1' : 'left-1/2'}
    `}
  />
<label className="relative z-10 flex-1 text-center py-2 cursor-pointer">
    <input
      type="radio"
      name="role"
      checked={formData.role === 'admin'}
      onChange={() => handleRoleChange('admin')}
      className="sr-only"
    />
    <span className={formData.role === 'admin' ? 'text-white font-semibold text-lg' : 'text-gray-700 font-semibold'}>
      Admin
    </span>
  </label>
  <label className="relative z-10 flex-1 text-center py-2 cursor-pointer">
    <input
      type="radio"
      name="role"
      checked={formData.role === 'staff'}
      onChange={() => handleRoleChange('staff')}
      className="sr-only"
    />
    <span className={formData.role === 'staff' ? 'text-white font-semibold text-lg' : 'text-gray-700 font-semibold'}>
      Staff
    </span>
  </label>

  {/* <label className="relative z-10 flex-1 text-center py-2 cursor-pointer">
    <input
      type="radio"
      name="role"
      checked={formData.role === 'admin'}
      onChange={() => handleRoleChange('admin')}
      className="sr-only"
    />
    <span className={formData.role === 'admin' ? 'text-white' : 'text-gray-700'}>
      Admin
    </span>
  </label> */}
</div>

        {/* Basic Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-600 uppercase mb-1">Username</label>
            <input
              className="border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-black"
              placeholder="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-600 uppercase mb-1">Password</label>
            <input
              className="border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-black"
              placeholder="••••••••"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-gray-600 uppercase mb-1">Full Name</label>
          <input
            className="border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-black"
            placeholder="Sriii Jiii"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-600 uppercase mb-1">Email Address</label>
            <input
              className="border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-black"
              placeholder="name@organization.com"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-600 uppercase mb-1">Phone Number</label>
            <input
              className="border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-black"
              placeholder="10-digit number"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Address */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-gray-600 uppercase mb-1">Address</label>
          <textarea
            className="border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-black resize-none h-16"
            placeholder="Complete address details"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
          />
        </div>

        {/* Role Conditional Fields */}
        {formData.role === 'admin' && (
          <div className="flex flex-col p-3.5 bg-red-50/20 border border-red-100 rounded-xl animate-[fadeInUp_1.2s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <label className="text-[10px] font-bold text-red-750 uppercase mb-1">Organization / School / College Name</label>
            <input
              className="border border-gray-250 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-black bg-white"
              placeholder="e.g. Stanford University"
              name="orgName"
              value={formData.orgName}
              onChange={handleChange}
              required={formData.role === 'admin'}
            />
            <span className="text-[9px] text-gray-400 mt-1.5 leading-normal">
              * An admin registration automatically generates a 6-digit staff code to invite your staff.
            </span>
          </div>
        )}

        {formData.role === 'staff' && (
          <div className="flex flex-col p-3.5 bg-yellow-50/20 border border-yellow-100 rounded-xl animate-[fadeInUp_1.2s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <label className="text-[10px] font-bold text-yellow-800 uppercase mb-1">Admin Unique Code (6-Digits)</label>
            <input
              className="border border-gray-250 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-black bg-white font-mono text-center tracking-widest text-lg font-bold"
              placeholder="••••••"
              name="staffCode"
              maxLength={6}
              value={formData.staffCode}
              onChange={handleChange}
              required={formData.role === 'staff'}
            />
            <span className="text-[9px] text-gray-400 mt-1.5 leading-normal">
              * Enter the 6-digit registration code provided by your Admin. Your account will require their approval to log in.
            </span>
          </div>
        )}

        <button 
          type="submit" 
          className="bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl transition-all shadow-md mt-2 cursor-pointer text-center text-sm"
        >
          Register {formData.role === 'admin' ? 'Admin' : 'Staff'}
        </button>
      </form>

      <p className="text-xs text-center mt-4 font-medium text-gray-550">
        Already have an account?{' '}
        <button onClick={onToggle} className="text-red-700 hover:underline font-bold bg-transparent border-none cursor-pointer">
          Login
        </button>
      </p>
    </div>
  );
};

export default Register;
