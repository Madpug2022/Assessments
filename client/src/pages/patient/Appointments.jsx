import { useEffect, useState } from 'react';
import { appointmentService } from '../../services/appointmentService';
import { userService } from '../../services/userService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Label } from '../../components/Label';
import { format } from 'date-fns';
import { Calendar, Clock, User, X } from 'lucide-react';

export const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    doctor: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
    symptoms: '',
  });
  const [errors, setErrors] = useState({
    doctor: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
  });
  const [touched, setTouched] = useState({
    doctor: false,
    appointmentDate: false,
    appointmentTime: false,
    reason: false,
  });
  const [isFormValid, setIsFormValid] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { appointments: data } = await appointmentService.getAll();
      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { users } = await userService.getAll({ role: 'doctor' });
      setDoctors(users);
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    }
  };

  // Validate individual form fields based on business rules (future dates, business hours, min length)
  // I added error state to contain a message for each field, and touched state to track if the user has interacted with the field. This way we can show error messages only after the user has interacted with the field. I also added a isFormValid state to track if the form is valid or not, and disable the submit button if the form is not valid. Written by Matias.
  // The validateField function checks the value of each field against the specified validation rules and returns an appropriate error message if the validation fails. The validateForm function aggregates the errors for all fields and updates the form's validity state. The handleFieldChange and handleFieldBlur functions manage user interactions with the form fields, updating the form data, touched state, and error messages accordingly.
  // This approach ensures that users receive immediate feedback on their input, guiding them to correct any issues before submitting the form. It also enhances the overall user experience by preventing invalid submissions and providing clear instructions on how to fix any errors.
  // The timeout for the success message is set to 5 seconds, which gives users enough time to see the confirmation without it lingering too long on the screen.
  // Written by Matias.
  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'doctor':
        if (!value) {
          error = 'Please select a doctor';
        }
        break;
        
      case 'appointmentDate':
        if (!value) {
          error = 'Date is required';
        } else {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) {
            error = 'Date must be in the future';
          }
        }
        break;
        
      case 'appointmentTime':
        if (!value) {
          error = 'Time is required';
        } else {
          const [hours, minutes] = value.split(':');
          const timeInMinutes = parseInt(hours) * 60 + parseInt(minutes);
          const startTime = 9 * 60;
          const endTime = 17 * 60; 
          
          if (timeInMinutes < startTime || timeInMinutes >= endTime) {
            error = 'Time must be between 9:00 AM and 5:00 PM';
          }
        }
        break;
        
      case 'reason':
        if (!value) {
          error = 'Reason is required';
        } else if (value.trim().length < 10) {
          error = 'Reason must be at least 10 characters';
        }
        break;
    }
    
    return error;
  };

  const validateForm = () => {
    const newErrors = {
      doctor: validateField('doctor', formData.doctor),
      appointmentDate: validateField('appointmentDate', formData.appointmentDate),
      appointmentTime: validateField('appointmentTime', formData.appointmentTime),
      reason: validateField('reason', formData.reason),
    };
    
    setErrors(newErrors);
    
    const isValid = Object.values(newErrors).every(error => error === '');
    setIsFormValid(isValid);
    
    return isValid;
  };

  const handleFieldChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
    
    setTouched({ ...touched, [name]: true });
    
    const error = validateField(name, value);
    setErrors({ ...errors, [name]: error });
    
    const newErrors = {
      doctor: validateField('doctor', name === 'doctor' ? value : formData.doctor),
      appointmentDate: validateField('appointmentDate', name === 'appointmentDate' ? value : formData.appointmentDate),
      appointmentTime: validateField('appointmentTime', name === 'appointmentTime' ? value : formData.appointmentTime),
      reason: validateField('reason', name === 'reason' ? value : formData.reason),
    };
    const isValid = Object.values(newErrors).every(error => error === '');
    setIsFormValid(isValid);
  };

  const handleFieldBlur = (name) => {
    setTouched({ ...touched, [name]: true });
    const error = validateField(name, formData[name]);
    setErrors({ ...errors, [name]: error });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setTouched({
      doctor: true,
      appointmentDate: true,
      appointmentTime: true,
      reason: true,
    });
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await appointmentService.create(formData);
      
      setShowForm(false);
      setFormData({
        doctor: '',
        appointmentDate: '',
        appointmentTime: '',
        reason: '',
        symptoms: '',
      });

      setErrors({
        doctor: '',
        appointmentDate: '',
        appointmentTime: '',
        reason: '',
      });
      setTouched({
        doctor: false,
        appointmentDate: false,
        appointmentTime: false,
        reason: false,
      });
      setIsFormValid(false);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000); 
      
      fetchAppointments();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create appointment');
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await appointmentService.update(id, { status: 'cancelled' });
        fetchAppointments();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to cancel appointment');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground mt-2">Manage your medical appointments</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          Book Appointment
        </Button>
      </div>

      {/* There is no design for this but i created this to display the message */}
      {showSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> Your appointment has been booked successfully.</span>
          <span 
            className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer"
            onClick={() => setShowSuccess(false)}
          >
            <X className="h-5 w-5" />
          </span>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Book New Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doctor">Doctor *</Label>
                  <select
                    id="doctor"
                    className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                      touched.doctor && errors.doctor 
                        ? 'border-red-500 bg-background' 
                        : 'border-input bg-background'
                    }`}
                    value={formData.doctor}
                    onChange={(e) => handleFieldChange('doctor', e.target.value)}
                    onBlur={() => handleFieldBlur('doctor')}
                  >
                    <option value="">Select a doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.name} {doctor.specialization && `- ${doctor.specialization}`}
                      </option>
                    ))}
                  </select>
                  {touched.doctor && errors.doctor && (
                    <p className="text-sm text-red-500">{errors.doctor}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointmentDate">Date *</Label>
                  <Input
                    id="appointmentDate"
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) => handleFieldChange('appointmentDate', e.target.value)}
                    onBlur={() => handleFieldBlur('appointmentDate')}
                    className={touched.appointmentDate && errors.appointmentDate ? 'border-red-500' : ''}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {touched.appointmentDate && errors.appointmentDate && (
                    <p className="text-sm text-red-500">{errors.appointmentDate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointmentTime">Time *</Label>
                  <Input
                    id="appointmentTime"
                    type="time"
                    value={formData.appointmentTime}
                    onChange={(e) => handleFieldChange('appointmentTime', e.target.value)}
                    onBlur={() => handleFieldBlur('appointmentTime')}
                    className={touched.appointmentTime && errors.appointmentTime ? 'border-red-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground">Business hours: 9:00 AM - 5:00 PM</p>
                  {touched.appointmentTime && errors.appointmentTime && (
                    <p className="text-sm text-red-500">{errors.appointmentTime}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => handleFieldChange('reason', e.target.value)}
                    onBlur={() => handleFieldBlur('reason')}
                    className={touched.reason && errors.reason ? 'border-red-500' : ''}
                    placeholder="Brief reason for visit (min 10 characters)"
                  />
                  {touched.reason && errors.reason && (
                    <p className="text-sm text-red-500">{errors.reason}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="symptoms">Symptoms (Optional)</Label>
                <textarea
                  id="symptoms"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  placeholder="Describe your symptoms..."
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={!isFormValid || !formData.doctor || !formData.appointmentDate || !formData.appointmentTime || !formData.reason}
                >
                  Book Appointment
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      doctor: '',
                      appointmentDate: '',
                      appointmentTime: '',
                      reason: '',
                      symptoms: '',
                    });
                    setErrors({
                      doctor: '',
                      appointmentDate: '',
                      appointmentTime: '',
                      reason: '',
                    });
                    setTouched({
                      doctor: false,
                      appointmentDate: false,
                      appointmentTime: false,
                      reason: false,
                    });
                    setIsFormValid(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No appointments found</p>
            </CardContent>
          </Card>
        ) : (
          appointments.map((appointment) => (
            <Card key={appointment._id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold">
                        Dr. {appointment.doctor?.name}
                      </span>
                      {appointment.doctor?.specialization && (
                        <span className="text-sm text-muted-foreground">
                          - {appointment.doctor.specialization}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(appointment.appointmentDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{appointment.appointmentTime}</span>
                      </div>
                    </div>
                    {appointment.reason && (
                      <p className="text-sm">{appointment.reason}</p>
                    )}
                    {appointment.symptoms && (
                      <p className="text-sm text-muted-foreground">
                        Symptoms: {appointment.symptoms}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                    {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(appointment._id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

